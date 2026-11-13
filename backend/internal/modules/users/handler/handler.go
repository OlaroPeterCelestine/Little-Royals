package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	usermodel "github.com/little-royals/school-api/internal/modules/users/model"
	"github.com/little-royals/school-api/internal/platform/cache"
	"github.com/little-royals/school-api/internal/platform/realtime"
	"github.com/little-royals/school-api/internal/platform/security"
	"github.com/little-royals/school-api/internal/shared/middleware"
	"github.com/little-royals/school-api/internal/shared/pagination"
	"github.com/little-royals/school-api/internal/shared/response"
)

type Handler struct {
	db    *gorm.DB
	cache *cache.Cache
	hub   *realtime.Hub
}

func New(db *gorm.DB, cch *cache.Cache, hub *realtime.Hub) *Handler {
	return &Handler{db: db, cache: cch, hub: hub}
}

type createUserRequest struct {
	Email    string         `json:"email" binding:"required,email"`
	Password string         `json:"password" binding:"required,min=8,max=72"`
	Name     string         `json:"name" binding:"required,min=2,max=160"`
	Role     usermodel.Role `json:"role" binding:"required"`
	Phone    string         `json:"phone" binding:"omitempty,max=40"`
	Status   string         `json:"status" binding:"omitempty,oneof=Active Inactive Suspended"`
}

type updateUserRequest struct {
	Email    *string         `json:"email" binding:"omitempty,email"`
	Password *string         `json:"password" binding:"omitempty,min=8,max=72"`
	Name     *string         `json:"name" binding:"omitempty,min=2,max=160"`
	Role     *usermodel.Role `json:"role"`
	Phone    *string         `json:"phone" binding:"omitempty,max=40"`
	Status   *string         `json:"status" binding:"omitempty,oneof=Active Inactive Suspended"`
}


func (h *Handler) Register(r *gin.RouterGroup) {
	adminOnly := middleware.RequireRoles("SuperAdmin", "Admin")
	r.GET("", adminOnly, h.List)
	r.GET("/:id", adminOnly, h.Get)
	r.POST("", adminOnly, h.Create)
	r.PUT("/:id", adminOnly, h.Update)
	r.DELETE("/:id", adminOnly, h.Delete)
}

func (h *Handler) List(c *gin.Context) {
	p := pagination.FromContext(c)
	var items []usermodel.User
	var total int64
	q := h.db.Model(&usermodel.User{})
	if err := q.Count(&total).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "list failed")
		return
	}
	if err := q.Order("created_at desc").Offset(p.Offset()).Limit(p.Limit).Find(&items).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "list failed")
		return
	}
	response.JSONMeta(c, http.StatusOK, items, pagination.Meta{Page: p.Page, Limit: p.Limit, Total: total})
}

func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	var user usermodel.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		response.Error(c, http.StatusNotFound, "user not found")
		return
	}
	response.OK(c, user)
}

func (h *Handler) Create(c *gin.Context) {
	var in createUserRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid user payload")
		return
	}
	if _, ok := usermodel.ValidRoles[in.Role]; !ok {
		response.Error(c, http.StatusBadRequest, "invalid role")
		return
	}
	// Only SuperAdmin may create SuperAdmin
	claims := middleware.Claims(c)
	if in.Role == usermodel.RoleSuperAdmin && (claims == nil || claims.Role != string(usermodel.RoleSuperAdmin)) {
		response.Error(c, http.StatusForbidden, "cannot assign SuperAdmin")
		return
	}
	hash, err := security.HashPassword(in.Password)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid password")
		return
	}
	status := in.Status
	if status == "" {
		status = "Active"
	}
	user := usermodel.User{
		Email:        strings.ToLower(strings.TrimSpace(in.Email)),
		PasswordHash: hash,
		Name:         strings.TrimSpace(in.Name),
		Role:         in.Role,
		Phone:        strings.TrimSpace(in.Phone),
		Status:       status,
	}
	if err := h.db.Create(&user).Error; err != nil {
		response.Error(c, http.StatusBadRequest, "create failed")
		return
	}
	h.bust(c)
	response.Created(c, user)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	var user usermodel.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		response.Error(c, http.StatusNotFound, "user not found")
		return
	}
	var in updateUserRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid user payload")
		return
	}
	claims := middleware.Claims(c)
	updates := map[string]any{}
	if in.Email != nil {
		updates["email"] = strings.ToLower(strings.TrimSpace(*in.Email))
	}
	if in.Name != nil {
		updates["name"] = strings.TrimSpace(*in.Name)
	}
	if in.Phone != nil {
		updates["phone"] = strings.TrimSpace(*in.Phone)
	}
	if in.Status != nil {
		updates["status"] = *in.Status
	}
	if in.Role != nil {
		if _, ok := usermodel.ValidRoles[*in.Role]; !ok {
			response.Error(c, http.StatusBadRequest, "invalid role")
			return
		}
		if *in.Role == usermodel.RoleSuperAdmin && (claims == nil || claims.Role != string(usermodel.RoleSuperAdmin)) {
			response.Error(c, http.StatusForbidden, "cannot assign SuperAdmin")
			return
		}
		updates["role"] = *in.Role
	}
	if in.Password != nil {
		hash, err := security.HashPassword(*in.Password)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "invalid password")
			return
		}
		updates["password_hash"] = hash
	}
	if len(updates) == 0 {
		response.Error(c, http.StatusBadRequest, "no updatable fields")
		return
	}
	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		response.Error(c, http.StatusBadRequest, "update failed")
		return
	}
	_ = h.db.First(&user, "id = ?", id)
	h.bust(c)
	response.OK(c, user)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	claims := middleware.Claims(c)
	if claims != nil && claims.UserID == id {
		response.Error(c, http.StatusBadRequest, "cannot delete your own account")
		return
	}
	res := h.db.Delete(&usermodel.User{}, "id = ?", id)
	if res.Error != nil || res.RowsAffected == 0 {
		response.Error(c, http.StatusNotFound, "user not found")
		return
	}
	h.bust(c)
	response.OK(c, gin.H{"deleted": id})
}

func (h *Handler) bust(c *gin.Context) {
	if h.cache != nil {
		h.cache.DeletePrefix(c.Request.Context(), "user:")
	}
	if h.hub != nil {
		h.hub.Publish(c.Request.Context(), realtime.Event{
			Type:    "resource.updated",
			Payload: map[string]string{"resource": "users"},
		})
	}
}
