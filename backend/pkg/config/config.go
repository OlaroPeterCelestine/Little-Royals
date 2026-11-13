package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadDotEnv() {
	_ = godotenv.Load()
}

func Get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// MustJWTSecret returns JWT_SECRET or exits. No hardcoded defaults.
func MustJWTSecret() string {
	secret := Get("JWT_SECRET", "")
	if len(secret) < 32 {
		log.Fatal("JWT_SECRET must be set (openssl rand -hex 32)")
	}
	return secret
}

// Port prefers generic PORT, then a service-specific key.
func Port(serviceKey, fallback string) string {
	if v := os.Getenv("PORT"); v != "" {
		return v
	}
	return Get(serviceKey, fallback)
}
