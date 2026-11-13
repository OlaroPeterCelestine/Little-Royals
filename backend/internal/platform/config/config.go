package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv      string
	AppName     string
	HTTPPort    string
	CORSOrigins []string

	DBDriver string // sqlite | postgres
	DBDSN    string

	RedisAddr     string
	RedisPassword string
	RedisDB       int

	JWTSecret string
	JWTTTL    time.Duration

	SchoolName    string
	SchoolCode    string
	SchoolCountry string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	ttlHours := getenvInt("JWT_TTL_HOURS", 24)
	if ttlHours < 1 {
		ttlHours = 1
	}
	if ttlHours > 24*30 {
		ttlHours = 24 * 30
	}
	cfg := &Config{
		AppEnv:        getenv("APP_ENV", "development"),
		AppName:       getenv("APP_NAME", "Little Royals School API"),
		HTTPPort:      firstNonEmpty(os.Getenv("PORT"), os.Getenv("HTTP_PORT"), "8080"),
		CORSOrigins:   splitCSV(getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")),
		DBDriver:      getenv("DB_DRIVER", "sqlite"),
		DBDSN:         getenv("DB_DSN", "file:school.db?cache=shared&_fk=1"),
		RedisAddr:     getenv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword: getenv("REDIS_PASSWORD", ""),
		RedisDB:       getenvInt("REDIS_DB", 0),
		JWTSecret:     getenv("JWT_SECRET", ""),
		JWTTTL:        time.Duration(ttlHours) * time.Hour,
		SchoolName:    getenv("SCHOOL_NAME", "Little Royals Kindergarten and Primary School"),
		SchoolCode:    getenv("SCHOOL_CODE", "LRKPS"),
		SchoolCountry: getenv("SCHOOL_COUNTRY", "Uganda"),
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) Validate() error {
	if len(c.JWTSecret) < 32 {
		return errConfig("JWT_SECRET must be at least 32 chars (openssl rand -hex 32)")
	}
	switch c.DBDriver {
	case "sqlite", "postgres":
	default:
		return errConfig("DB_DRIVER must be sqlite or postgres")
	}
	if len(c.CORSOrigins) == 0 {
		return errConfig("CORS_ORIGINS must include at least one origin")
	}
	for _, o := range c.CORSOrigins {
		if o == "*" {
			return errConfig("CORS_ORIGINS must not use wildcard when credentials are enabled")
		}
	}
	return nil
}

type configError string

func (e configError) Error() string { return string(e) }

func errConfig(msg string) error { return configError(msg) }

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
