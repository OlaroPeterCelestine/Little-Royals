package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/little-royals/school-api/internal/modules/notifications/model"
	"github.com/little-royals/school-api/internal/platform/cache"
	"github.com/little-royals/school-api/internal/platform/realtime"
)

type Service struct {
	db    *gorm.DB
	hub   *realtime.Hub
	cache *cache.Cache
}

func New(db *gorm.DB, hub *realtime.Hub, c *cache.Cache) *Service {
	return &Service{db: db, hub: hub, cache: c}
}

type CreateInput struct {
	UserID *uuid.UUID `json:"userId"`
	Title  string     `json:"title" binding:"required"`
	Body   string     `json:"body"`
	Route  string     `json:"route"`
	Tone   string     `json:"tone"`
}

func (s *Service) List(userID uuid.UUID, limit int) ([]model.Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	var items []model.Notification
	err := s.db.Where("user_id IS NULL OR user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Find(&items).Error
	return items, err
}

func (s *Service) Create(ctx context.Context, in CreateInput) (*model.Notification, error) {
	n := model.Notification{
		UserID: in.UserID,
		Title:  in.Title,
		Body:   in.Body,
		Route:  in.Route,
		Tone:   in.Tone,
	}
	if err := s.db.Create(&n).Error; err != nil {
		return nil, err
	}
	if s.cache != nil {
		s.cache.DeletePrefix(ctx, "notifications:")
	}
	if s.hub != nil {
		s.hub.Publish(ctx, realtime.Event{
			Type:    "notification",
			Payload: n,
			At:      time.Now().UTC(),
		})
	}
	return &n, nil
}

func (s *Service) MarkRead(id, userID uuid.UUID) error {
	res := s.db.Model(&model.Notification{}).
		Where("id = ? AND (user_id IS NULL OR user_id = ?)", id, userID).
		Update("read", true)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *Service) Broadcast(ctx context.Context, title, body, route, tone string) (*model.Notification, error) {
	return s.Create(ctx, CreateInput{
		Title: title,
		Body:  body,
		Route: route,
		Tone:  tone,
	})
}
