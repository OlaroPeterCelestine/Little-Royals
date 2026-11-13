package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	notifsvc "github.com/little-royals/school-api/internal/modules/notifications/service"
	"github.com/little-royals/school-api/internal/platform/realtime"
	"github.com/little-royals/school-api/internal/platform/security"
	"github.com/little-royals/school-api/internal/shared/middleware"
	"github.com/little-royals/school-api/internal/shared/response"
)

type Handler struct {
	svc    *notifsvc.Service
	hub    *realtime.Hub
	tokens *security.TokenService
}

func New(svc *notifsvc.Service, hub *realtime.Hub, tokens *security.TokenService) *Handler {
	return &Handler{svc: svc, hub: hub, tokens: tokens}
}

func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("", h.List)
	r.POST("", middleware.RequireRoles("SuperAdmin", "Admin", "HeadTeacher"), h.Create)
	r.POST("/:id/read", h.MarkRead)
}

func (h *Handler) List(c *gin.Context) {
	claims := middleware.Claims(c)
	if claims == nil {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.List(claims.UserID, 40)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "list failed")
		return
	}
	response.OK(c, items)
}

func (h *Handler) Create(c *gin.Context) {
	var in notifsvc.CreateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		response.Error(c, http.StatusBadRequest, "title is required")
		return
	}
	n, err := h.svc.Create(c.Request.Context(), in)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "create failed")
		return
	}
	response.Created(c, n)
}

func (h *Handler) MarkRead(c *gin.Context) {
	claims := middleware.Claims(c)
	if claims == nil {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.svc.MarkRead(id, claims.UserID); err != nil {
		response.Error(c, http.StatusNotFound, "notification not found")
		return
	}
	response.OK(c, gin.H{"read": id})
}

// WS upgrades to WebSocket. Token via query ?token= or Authorization header.
func (h *Handler) WS(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		auth := c.GetHeader("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		}
	}
	if token == "" {
		response.Error(c, http.StatusUnauthorized, "missing token")
		return
	}
	claims, err := h.tokens.Parse(token)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "invalid token")
		return
	}
	h.hub.ServeWS(c.Writer, c.Request, claims.UserID.String(), claims.Role)
}
