package service

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/little-royals/school-api/internal/modules/auth/dto"
	usermodel "github.com/little-royals/school-api/internal/modules/users/model"
	"github.com/little-royals/school-api/internal/platform/security"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInactiveUser       = errors.New("user is not active")
)

type AuthService struct {
	db     *gorm.DB
	tokens *security.TokenService
}

func New(db *gorm.DB, tokens *security.TokenService) *AuthService {
	return &AuthService{db: db, tokens: tokens}
}

func (s *AuthService) Login(req dto.LoginRequest) (*dto.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	var user usermodel.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.Status != "Active" {
		return nil, ErrInactiveUser
	}
	if !security.CheckPassword(user.PasswordHash, req.Password) {
		return nil, ErrInvalidCredentials
	}

	// Transparent upgrade: bcrypt / old argon → current Argon2id.
	if security.NeedsRehash(user.PasswordHash) {
		if next, err := security.HashPassword(req.Password); err == nil {
			_ = s.db.Model(&user).Update("password_hash", next).Error
			user.PasswordHash = next
		}
	}

	token, exp, err := s.tokens.Sign(user.ID, user.Email, user.Name, string(user.Role))
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	_ = s.db.Model(&user).Update("last_login_at", now).Error

	return &dto.LoginResponse{
		Token:     token,
		ExpiresAt: exp.Format(time.RFC3339),
		Email:     user.Email,
		Name:      user.Name,
		Role:      string(user.Role),
		UserID:    user.ID.String(),
	}, nil
}

func (s *AuthService) Me(userID string) (*usermodel.User, error) {
	var user usermodel.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
