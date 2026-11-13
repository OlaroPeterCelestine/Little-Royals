package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    *uuid.UUID     `gorm:"type:uuid;index" json:"userId,omitempty"` // nil = broadcast
	Title     string         `gorm:"size:200;not null" json:"title"`
	Body      string         `gorm:"size:500" json:"body"`
	Route     string         `gorm:"size:120" json:"route,omitempty"`
	Tone      string         `gorm:"size:20;not null;default:blue" json:"tone"`
	Read      bool           `gorm:"not null;default:false" json:"read"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.Tone == "" {
		n.Tone = "blue"
	}
	return nil
}
