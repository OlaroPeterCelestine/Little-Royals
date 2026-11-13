package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// School is the singleton school profile (single-school deployment).
type School struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string         `gorm:"size:200;not null" json:"name"`
	Code      string         `gorm:"size:32;uniqueIndex;not null" json:"code"`
	Motto     string         `gorm:"size:255" json:"motto,omitempty"`
	Email     string         `gorm:"size:120" json:"email,omitempty"`
	Phone     string         `gorm:"size:40" json:"phone,omitempty"`
	Address   string         `gorm:"size:255" json:"address,omitempty"`
	City      string         `gorm:"size:100" json:"city,omitempty"`
	Country   string         `gorm:"size:100" json:"country,omitempty"`
	Website   string         `gorm:"size:120" json:"website,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *School) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
