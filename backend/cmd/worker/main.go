package main

import (
	"context"
	"log"

	"github.com/hibiken/asynq"

	"github.com/little-royals/school-api/internal/platform/config"
)

// Background worker (Asynq) for SMS, report cards, invoices, and reminders.
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisAddr, Password: cfg.RedisPassword, DB: cfg.RedisDB},
		asynq.Config{Concurrency: 5},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc("notifications:email", func(ctx context.Context, t *asynq.Task) error {
		log.Printf("processed %s payload=%d bytes", t.Type(), len(t.Payload()))
		return nil
	})
	mux.HandleFunc("reports:generate", func(ctx context.Context, t *asynq.Task) error {
		log.Printf("processed %s", t.Type())
		return nil
	})

	log.Printf("asynq worker listening (redis=%s)", cfg.RedisAddr)
	if err := srv.Run(mux); err != nil {
		log.Fatal(err)
	}
}
