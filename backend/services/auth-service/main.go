package main

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/little-royals/school-api/internal/platform/security"
	"github.com/little-royals/school-api/pkg/config"
	"github.com/little-royals/school-api/pkg/ginserver"
	"github.com/little-royals/school-api/pkg/response"
)

const serviceName = "auth-service"

// Legacy microservice wrapper — prefer cmd/api.
// Passwords use Argon2id (legacy bcrypt still verified).

type user struct {
	ID           uuid.UUID
	Email        string
	Name         string
	Role         string
	Status       string
	PasswordHash string
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Remember bool   `json:"remember"`
}

func main() {
	config.LoadDotEnv()
	port := config.Port("AUTH_PORT", "8081")
	secret := config.MustJWTSecret()
	ttlHours := 24
	tokens := security.NewTokenService(secret, time.Duration(ttlHours)*time.Hour)

	// Empty user store — use cmd/api with DB for real auth.
	users := map[string]user{}

	r := ginserver.New(serviceName)
	r.GET("/health", func(c *gin.Context) {
		response.Health(c, serviceName)
	})

	r.POST("/api/v1/auth/login", func(c *gin.Context) {
		var body loginRequest
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, "email and password are required")
			return
		}
		email := strings.ToLower(strings.TrimSpace(body.Email))
		u, ok := users[email]
		if !ok || u.Status != "Active" || !security.CheckPassword(u.PasswordHash, body.Password) {
			response.Error(c, http.StatusUnauthorized, "invalid email or password")
			return
		}
		token, exp, err := tokens.Sign(u.ID, u.Email, u.Name, u.Role)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "token issue failed")
			return
		}
		response.JSON(c, http.StatusOK, gin.H{
			"token":     token,
			"expiresAt": exp.Format(time.RFC3339),
			"email":     u.Email,
			"name":      u.Name,
			"role":      u.Role,
			"userId":    u.ID.String(),
		})
	})

	addr := ":" + port
	log.Printf("[%s] listening on %s (use cmd/api for full auth)", serviceName, addr)
	log.Fatal(r.Run(addr))
}
