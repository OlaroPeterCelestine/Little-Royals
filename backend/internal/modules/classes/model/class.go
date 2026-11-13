package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Class struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string         `gorm:"size:80;uniqueIndex;not null" json:"name"`
	Level     string         `gorm:"size:40" json:"level,omitempty"`
	Stream    string         `gorm:"size:40" json:"stream,omitempty"`
	Teacher   string         `gorm:"size:120" json:"teacher,omitempty"`
	Room      string         `gorm:"size:40" json:"room,omitempty"`
	Capacity  int            `json:"capacity,omitempty"`
	Status    string         `gorm:"size:20;not null;default:Active" json:"status"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *Class) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
