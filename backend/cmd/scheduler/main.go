package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/robfig/cron/v3"

	"github.com/little-royals/school-api/internal/platform/config"
)

// Scheduler for recurring school jobs (fee reminders, attendance digests, backups).
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	_ = cfg

	c := cron.New(cron.WithSeconds())
	_, _ = c.AddFunc("0 0 7 * * *", func() {
		log.Printf("scheduled: morning attendance digest @ %s", time.Now().UTC().Format(time.RFC3339))
	})
	_, _ = c.AddFunc("0 0 18 * * 5", func() {
		log.Printf("scheduled: weekly fee reminder @ %s", time.Now().UTC().Format(time.RFC3339))
	})
	c.Start()
	log.Println("scheduler started")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx := c.Stop()
	<-ctx.Done()
	log.Println("scheduler stopped")
}
