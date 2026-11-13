package cache

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Cache is a small JSON cache with Redis primary and in-memory fallback.
type Cache struct {
	rdb    *goredis.Client
	log    *zap.Logger
	mu     sync.RWMutex
	memory map[string]memEntry
	prefix string
}

type memEntry struct {
	data []byte
	exp  time.Time
}

func New(rdb *goredis.Client, log *zap.Logger) *Cache {
	c := &Cache{
		rdb:    rdb,
		log:    log,
		memory: make(map[string]memEntry),
		prefix: "lr:cache:",
	}
	go c.janitor()
	if rdb != nil {
		log.Info("cache ready", zap.String("backend", "redis"))
	} else {
		log.Info("cache ready", zap.String("backend", "memory"))
	}
	return c
}

func (c *Cache) Enabled() bool { return true }

func (c *Cache) Backend() string {
	if c.rdb != nil {
		return "redis"
	}
	return "memory"
}

func (c *Cache) GetJSON(ctx context.Context, key string, dest interface{}) (bool, error) {
	full := c.prefix + key
	if c.rdb != nil {
		val, err := c.rdb.Get(ctx, full).Bytes()
		if err == goredis.Nil {
			return false, nil
		}
		if err != nil {
			c.log.Warn("redis get failed — trying memory", zap.Error(err))
		} else {
			return true, json.Unmarshal(val, dest)
		}
	}
	c.mu.RLock()
	entry, ok := c.memory[full]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.exp) {
		return false, nil
	}
	return true, json.Unmarshal(entry.data, dest)
}

func (c *Cache) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	full := c.prefix + key
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	if c.rdb != nil {
		if err := c.rdb.Set(ctx, full, data, ttl).Err(); err != nil {
			c.log.Warn("redis set failed — using memory", zap.Error(err))
		} else {
			return nil
		}
	}
	c.mu.Lock()
	c.memory[full] = memEntry{data: data, exp: time.Now().Add(ttl)}
	c.mu.Unlock()
	return nil
}

func (c *Cache) Delete(ctx context.Context, keys ...string) {
	fullKeys := make([]string, 0, len(keys))
	for _, k := range keys {
		fullKeys = append(fullKeys, c.prefix+k)
	}
	if c.rdb != nil && len(fullKeys) > 0 {
		if err := c.rdb.Del(ctx, fullKeys...).Err(); err != nil {
			c.log.Warn("redis del failed", zap.Error(err))
		}
	}
	c.mu.Lock()
	for _, k := range fullKeys {
		delete(c.memory, k)
	}
	c.mu.Unlock()
}

func (c *Cache) DeletePrefix(ctx context.Context, prefix string) {
	pattern := c.prefix + prefix + "*"
	if c.rdb != nil {
		iter := c.rdb.Scan(ctx, 0, pattern, 100).Iterator()
		var keys []string
		for iter.Next(ctx) {
			keys = append(keys, iter.Val())
		}
		if len(keys) > 0 {
			_ = c.rdb.Del(ctx, keys...).Err()
		}
	}
	c.mu.Lock()
	for k := range c.memory {
		if len(k) >= len(c.prefix+prefix) && k[:len(c.prefix+prefix)] == c.prefix+prefix {
			delete(c.memory, k)
		}
	}
	c.mu.Unlock()
}

func (c *Cache) janitor() {
	t := time.NewTicker(time.Minute)
	defer t.Stop()
	for range t.C {
		now := time.Now()
		c.mu.Lock()
		for k, v := range c.memory {
			if now.After(v.exp) {
				delete(c.memory, k)
			}
		}
		c.mu.Unlock()
	}
}
