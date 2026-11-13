package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FeeStructure struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string         `gorm:"size:120;not null" json:"name"`
	Program   string         `gorm:"size:80" json:"program,omitempty"`
	Term      string         `gorm:"size:40" json:"term,omitempty"`
	Amount    int64          `gorm:"not null" json:"amount"` // minor units (UGX)
	Status    string         `gorm:"size:20;not null;default:Active" json:"status"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (f *FeeStructure) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}

type Invoice struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	StudentName string         `gorm:"size:160;not null" json:"studentName"`
	InvoiceNo   string         `gorm:"size:40;uniqueIndex;not null" json:"invoiceNo"`
	Term        string         `gorm:"size:40" json:"term,omitempty"`
	Amount      int64          `gorm:"not null" json:"amount"`
	Paid        int64          `gorm:"not null;default:0" json:"paid"`
	Status      string         `gorm:"size:20;index;not null" json:"status"` // Unpaid, Partial, Paid
	DueDate     *time.Time     `json:"dueDate,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (i *Invoice) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}
