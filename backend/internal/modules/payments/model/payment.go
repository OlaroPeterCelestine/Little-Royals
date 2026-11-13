package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Payment struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	InvoiceID   *uuid.UUID     `gorm:"type:uuid;index" json:"invoiceId,omitempty"`
	StudentName string         `gorm:"size:160;not null" json:"studentName"`
	Amount      int64          `gorm:"not null" json:"amount"`
	Method      string         `gorm:"size:40" json:"method,omitempty"` // Cash, Mobile Money, Bank
	Reference   string         `gorm:"size:80" json:"reference,omitempty"`
	Status      string         `gorm:"size:20;not null;default:Completed" json:"status"`
	PaidAt      time.Time      `json:"paidAt"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.PaidAt.IsZero() {
		p.PaidAt = time.Now().UTC()
	}
	return nil
}
