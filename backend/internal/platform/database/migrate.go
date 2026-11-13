package database

import (
	"fmt"

	"gorm.io/gorm"

	attendancemodel "github.com/little-royals/school-api/internal/modules/attendance/model"
	classmodel "github.com/little-royals/school-api/internal/modules/classes/model"
	feemodel "github.com/little-royals/school-api/internal/modules/fees/model"
	notifmodel "github.com/little-royals/school-api/internal/modules/notifications/model"
	parentmodel "github.com/little-royals/school-api/internal/modules/parents/model"
	paymentmodel "github.com/little-royals/school-api/internal/modules/payments/model"
	schoolmodel "github.com/little-royals/school-api/internal/modules/school/model"
	staffmodel "github.com/little-royals/school-api/internal/modules/staff/model"
	studentmodel "github.com/little-royals/school-api/internal/modules/students/model"
	subjectmodel "github.com/little-royals/school-api/internal/modules/subjects/model"
	usermodel "github.com/little-royals/school-api/internal/modules/users/model"
)

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&schoolmodel.School{},
		&usermodel.User{},
		&studentmodel.Student{},
		&staffmodel.Staff{},
		&parentmodel.Parent{},
		&classmodel.Class{},
		&subjectmodel.Subject{},
		&attendancemodel.Attendance{},
		&feemodel.FeeStructure{},
		&feemodel.Invoice{},
		&paymentmodel.Payment{},
		&notifmodel.Notification{},
	); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	return nil
}
