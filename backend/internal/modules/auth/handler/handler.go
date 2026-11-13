package handler

import (
	"errors"
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/gin-gonic/gin"

	"github.com/little-royals/school-api/internal/modules/auth/dto"
	authsvc "github.com/little-royals/school-api/internal/modules/auth/service"
	"github.com/little-royals/school-api/internal/platform/security"
	"github.com/little-royals/school-api/internal/shared/middleware"
	"github.com/little-royals/school-api/internal/shared/response"
)

type Handler struct {
	auth     *authsvc.AuthService
	enforcer *casbin.Enforcer
}

func New(auth *authsvc.AuthService, enforcer *casbin.Enforcer) *Handler {
	return &Handler{auth: auth, enforcer: enforcer}
}

func (h *Handler) Login(c *gin.Context) {
	var req dto.LoginRequest
	// BodyWith so rate-limit middleware can peek the same payload.
	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "email and password are required")
		return
	}
	out, err := h.auth.Login(req)
	if err != nil {
		switch {
		case errors.Is(err, authsvc.ErrInvalidCredentials):
			response.Error(c, http.StatusUnauthorized, "invalid email or password")
		case errors.Is(err, authsvc.ErrInactiveUser):
			response.Error(c, http.StatusForbidden, "user is not active")
		default:
			response.Error(c, http.StatusInternalServerError, "login failed")
		}
		return
	}
	response.OK(c, out)
}

func (h *Handler) Me(c *gin.Context) {
	claims := middleware.Claims(c)
	if claims == nil {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	user, err := h.auth.Me(claims.UserID.String())
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	payload := gin.H{
		"id":     user.ID,
		"email":  user.Email,
		"name":   user.Name,
		"role":   user.Role,
		"status": user.Status,
		"phone":  user.Phone,
	}
	if h.enforcer != nil {
		payload["permissions"] = security.EffectivePermissions(h.enforcer, string(user.Role))
	}
	response.OK(c, payload)
}
