package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Subject struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name       string         `gorm:"size:120;not null" json:"name"`
	Code       string         `gorm:"size:40;uniqueIndex;not null" json:"code"`
	Program    string         `gorm:"size:80" json:"program,omitempty"`
	PeriodsPerWeek int        `json:"periodsPerWeek,omitempty"`
	Instructor string         `gorm:"size:120" json:"instructor,omitempty"`
	Status     string         `gorm:"size:20;not null;default:Active" json:"status"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *Subject) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
