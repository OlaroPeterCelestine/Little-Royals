package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const maxBodyBytes = 1 << 20 // 1 MiB

// SecureHeaders adds baseline browser/API hardening headers.
func SecureHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "no-referrer")
		c.Header("Cache-Control", "no-store")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		c.Next()
	}
}

// LimitBody rejects oversized request bodies.
func LimitBody(max int64) gin.HandlerFunc {
	if max <= 0 {
		max = maxBodyBytes
	}
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, max)
		}
		c.Next()
	}
}

func NormalizeOrigin(origin string) string {
	return strings.TrimRight(strings.TrimSpace(origin), "/")
}
