package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleSuperAdmin  Role = "SuperAdmin"
	RoleAdmin       Role = "Admin"
	RoleHeadTeacher Role = "HeadTeacher"
	RoleTeacher     Role = "Teacher"
	RoleAccountant  Role = "Accountant"
	RoleAdmissions  Role = "Admissions"
	RoleLibrarian   Role = "Librarian"
	RoleStaff       Role = "Staff"
	RoleStudent     Role = "Student"
	RoleParent      Role = "Parent"
)

// ValidRoles is the closed set of assignable desk roles.
var ValidRoles = map[Role]struct{}{
	RoleSuperAdmin:  {},
	RoleAdmin:       {},
	RoleHeadTeacher: {},
	RoleTeacher:     {},
	RoleAccountant:  {},
	RoleAdmissions:  {},
	RoleLibrarian:   {},
	RoleStaff:       {},
	RoleStudent:     {},
	RoleParent:      {},
}

type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string         `gorm:"size:160;uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"size:255;not null" json:"-"`
	Name         string         `gorm:"size:160;not null" json:"name"`
	Role         Role           `gorm:"size:40;index;not null" json:"role"`
	Phone        string         `gorm:"size:40" json:"phone,omitempty"`
	Status       string         `gorm:"size:20;index;not null;default:Active" json:"status"`
	LastLoginAt  *time.Time     `json:"lastLoginAt,omitempty"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	if u.Status == "" {
		u.Status = "Active"
	}
	return nil
}
