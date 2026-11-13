package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Staff struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	StaffNo    string         `gorm:"size:40;uniqueIndex;not null" json:"staffNo"`
	FirstName  string         `gorm:"size:80;not null" json:"firstName"`
	LastName   string         `gorm:"size:80;not null" json:"lastName"`
	Email      string         `gorm:"size:160" json:"email,omitempty"`
	Phone      string         `gorm:"size:40" json:"phone,omitempty"`
	RoleTitle  string         `gorm:"size:80" json:"roleTitle,omitempty"` // Teacher, Accountant, etc.
	Department string         `gorm:"size:80" json:"department,omitempty"`
	Subject    string         `gorm:"size:80" json:"subject,omitempty"`
	Status     string         `gorm:"size:20;index;not null;default:Active" json:"status"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *Staff) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.Status == "" {
		s.Status = "Active"
	}
	return nil
}
