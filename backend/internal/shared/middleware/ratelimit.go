package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"

	"github.com/little-royals/school-api/internal/shared/response"
)

// Limiter is a fixed-window counter (Redis when available, else in-memory).
type Limiter struct {
	rdb *goredis.Client
	mu  sync.Mutex
	mem map[string]memBucket
}

type memBucket struct {
	n     int
	until time.Time
}

func NewLimiter(rdb *goredis.Client) *Limiter {
	return &Limiter{
		rdb: rdb,
		mem: make(map[string]memBucket),
	}
}

func (l *Limiter) Allow(ctx context.Context, key string, max int, window time.Duration) (bool, int, time.Duration) {
	if max <= 0 {
		return true, 0, 0
	}
	if window <= 0 {
		window = time.Minute
	}
	if l.rdb != nil {
		return l.allowRedis(ctx, key, max, window)
	}
	return l.allowMemory(key, max, window)
}

func (l *Limiter) allowRedis(ctx context.Context, key string, max int, window time.Duration) (bool, int, time.Duration) {
	full := "lr:rl:" + key
	n, err := l.rdb.Incr(ctx, full).Result()
	if err != nil {
		return l.allowMemory(key, max, window)
	}
	if n == 1 {
		_ = l.rdb.Expire(ctx, full, window).Err()
	}
	ttl, _ := l.rdb.TTL(ctx, full).Result()
	if ttl < 0 {
		ttl = window
	}
	remaining := max - int(n)
	if remaining < 0 {
		remaining = 0
	}
	return int(n) <= max, remaining, ttl
}

func (l *Limiter) allowMemory(key string, max int, window time.Duration) (bool, int, time.Duration) {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.mem[key]
	if !ok || now.After(b.until) {
		b = memBucket{n: 0, until: now.Add(window)}
	}
	b.n++
	l.mem[key] = b
	remaining := max - b.n
	if remaining < 0 {
		remaining = 0
	}
	retry := b.until.Sub(now)
	if retry < 0 {
		retry = 0
	}
	return b.n <= max, remaining, retry
}

// RateLimit applies a general per-IP limit (API-wide).
func RateLimit(l *Limiter, max int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if l == nil {
			c.Next()
			return
		}
		key := "ip:" + c.ClientIP()
		ok, remaining, retry := l.Allow(c.Request.Context(), key, max, window)
		c.Header("X-RateLimit-Limit", strconv.Itoa(max))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		if !ok {
			sec := int(retry.Seconds())
			if sec < 1 {
				sec = 1
			}
			c.Header("Retry-After", strconv.Itoa(sec))
			response.Error(c, http.StatusTooManyRequests, "rate limit exceeded — try again shortly")
			c.Abort()
			return
		}
		c.Next()
	}
}

// LoginRateLimit limits by IP and by email (from JSON body peek via binding copy).
func LoginRateLimit(l *Limiter, maxPerIP, maxPerEmail int, window time.Duration) gin.HandlerFunc {
	if maxPerIP <= 0 {
		maxPerIP = 10
	}
	if maxPerEmail <= 0 {
		maxPerEmail = 5
	}
	if window <= 0 {
		window = time.Minute
	}

	return func(c *gin.Context) {
		if l == nil {
			c.Next()
			return
		}
		ipKey := "login:ip:" + c.ClientIP()
		ok, _, retry := l.Allow(c.Request.Context(), ipKey, maxPerIP, window)
		if !ok {
			denyLogin(c, retry)
			return
		}

		// Best-effort email key from body (does not consume body — Gin caches).
		var peek struct {
			Email string `json:"email"`
		}
		_ = c.ShouldBindBodyWithJSON(&peek)
		email := strings.ToLower(strings.TrimSpace(peek.Email))
		if email != "" {
			emailKey := "login:email:" + email
			ok, _, retry = l.Allow(c.Request.Context(), emailKey, maxPerEmail, window)
			if !ok {
				denyLogin(c, retry)
				return
			}
		}
		c.Next()
	}
}

func denyLogin(c *gin.Context, retry time.Duration) {
	sec := int(retry.Seconds())
	if sec < 1 {
		sec = 60
	}
	c.Header("Retry-After", strconv.Itoa(sec))
	c.Header("X-RateLimit-Limit", "login")
	response.Error(c, http.StatusTooManyRequests, "too many login attempts — try again shortly")
	c.Abort()
}

// Key helpers for tests / custom limits.
func LoginEmailKey(email string) string {
	return fmt.Sprintf("login:email:%s", strings.ToLower(strings.TrimSpace(email)))
}
