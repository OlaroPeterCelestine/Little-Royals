package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/little-royals/school-api/pkg/authutil"
	"github.com/little-royals/school-api/pkg/response"
)

const ClaimsKey = "claims"

func JWTAuth(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		tok, ok := authutil.BearerToken(c.GetHeader("Authorization"))
		if !ok {
			response.Error(c, http.StatusUnauthorized, "missing bearer token")
			return
		}
		claims, err := authutil.Parse(secret, tok)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		c.Set(ClaimsKey, claims)
		c.Next()
	}
}
