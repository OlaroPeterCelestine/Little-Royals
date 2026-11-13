package middleware

import (
	"net/http"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/gin-gonic/gin"

	"github.com/little-royals/school-api/internal/shared/response"
)

// Can reports whether role may perform action on object.
func Can(e *casbin.Enforcer, role, object, action string) bool {
	if e == nil {
		return false
	}
	ok, err := e.Enforce(role, object, action)
	return err == nil && ok
}

// Authorize checks Casbin policy: role, object, action (use as Gin middleware).
func Authorize(e *casbin.Enforcer, object, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := Claims(c)
		if claims == nil {
			response.Error(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}
		if !Can(e, claims.Role, object, action) {
			response.Error(c, http.StatusForbidden, "insufficient permissions")
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdmin allows only Admin / SuperAdmin / HeadTeacher (school ops).
func RequireAdmin() gin.HandlerFunc {
	return RequireRoles("SuperAdmin", "Admin", "HeadTeacher")
}

// ActionFromMethod maps HTTP verbs to Casbin actions.
func ActionFromMethod(method string) string {
	switch strings.ToUpper(method) {
	case http.MethodPost:
		return "create"
	case http.MethodPut, http.MethodPatch:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return "read"
	}
}
