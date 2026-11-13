package redis

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func Connect(addr, password string, db int, log *zap.Logger) (*goredis.Client, error) {
	client := goredis.NewClient(&goredis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Warn("redis unavailable — continuing without cache", zap.Error(err))
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	log.Info("redis connected", zap.String("addr", addr))
	return client, nil
}
