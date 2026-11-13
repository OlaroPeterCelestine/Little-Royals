package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Parent struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	FirstName  string         `gorm:"size:80;not null" json:"firstName"`
	LastName   string         `gorm:"size:80;not null" json:"lastName"`
	Relation   string         `gorm:"size:40" json:"relation,omitempty"`
	Phone      string         `gorm:"size:40" json:"phone,omitempty"`
	Email      string         `gorm:"size:160" json:"email,omitempty"`
	Occupation string         `gorm:"size:80" json:"occupation,omitempty"`
	Status     string         `gorm:"size:20;index;not null;default:Active" json:"status"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (p *Parent) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.Status == "" {
		p.Status = "Active"
	}
	return nil
}
