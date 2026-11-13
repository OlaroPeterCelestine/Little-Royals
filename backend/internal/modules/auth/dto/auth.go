package dto

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=72"`
	Remember bool   `json:"remember"`
}

type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expiresAt"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	UserID    string `json:"userId"`
}
