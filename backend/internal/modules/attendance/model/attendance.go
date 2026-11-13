package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Attendance struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	StudentID   *uuid.UUID     `gorm:"type:uuid;index" json:"studentId,omitempty"`
	StudentName string         `gorm:"size:160" json:"studentName"`
	ClassName   string         `gorm:"size:80;index" json:"className"`
	Date        time.Time      `gorm:"type:date;index;not null" json:"date"`
	Status      string         `gorm:"size:20;not null" json:"status"` // Present, Absent, Late, Excused
	Notes       string         `gorm:"size:255" json:"notes,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (a *Attendance) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
