package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Student struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	AdmissionNo string         `gorm:"size:40;uniqueIndex;not null" json:"admissionNo"`
	FirstName   string         `gorm:"size:80;not null" json:"firstName"`
	LastName    string         `gorm:"size:80;not null" json:"lastName"`
	Gender      string         `gorm:"size:20" json:"gender,omitempty"`
	DateOfBirth *time.Time     `json:"dateOfBirth,omitempty"`
	ClassName   string         `gorm:"size:80;index" json:"className,omitempty"`
	Program     string         `gorm:"size:80" json:"program,omitempty"`
	Status      string         `gorm:"size:20;index;not null;default:Active" json:"status"`
	Guardian    string         `gorm:"size:160" json:"guardian,omitempty"`
	Phone       string         `gorm:"size:40" json:"phone,omitempty"`
	Email       string         `gorm:"size:160" json:"email,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *Student) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.Status == "" {
		s.Status = "Active"
	}
	return nil
}

func (s *Student) FullName() string {
	return s.FirstName + " " + s.LastName
}
