package database

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"gorm.io/gorm"

	classmodel "github.com/little-royals/school-api/internal/modules/classes/model"
	feemodel "github.com/little-royals/school-api/internal/modules/fees/model"
	parentmodel "github.com/little-royals/school-api/internal/modules/parents/model"
	schoolmodel "github.com/little-royals/school-api/internal/modules/school/model"
	staffmodel "github.com/little-royals/school-api/internal/modules/staff/model"
	studentmodel "github.com/little-royals/school-api/internal/modules/students/model"
	subjectmodel "github.com/little-royals/school-api/internal/modules/subjects/model"
	usermodel "github.com/little-royals/school-api/internal/modules/users/model"
	"github.com/little-royals/school-api/internal/platform/config"
	"github.com/little-royals/school-api/internal/platform/security"
)

// SeedOneSchool loads the singleton school and initial records.
// Admin password is randomly generated (never DEMO_PASSWORD / never in .env).
func SeedOneSchool(db *gorm.DB, cfg *config.Config, log *zap.Logger) error {
	var count int64
	if err := db.Model(&schoolmodel.School{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	school := schoolmodel.School{
		Name:    cfg.SchoolName,
		Code:    cfg.SchoolCode,
		Country: cfg.SchoolCountry,
		City:    "Kampala",
		Motto:   "Excellence from the foundation",
		Email:   "info@littleroyals.school",
		Phone:   "+256700000000",
		Address: "Kampala, Uganda",
	}
	if err := db.Create(&school).Error; err != nil {
		return fmt.Errorf("seed school: %w", err)
	}

	plain, err := randomPassword(18)
	if err != nil {
		return err
	}
	hash, err := security.HashPassword(plain)
	if err != nil {
		return err
	}

	users := []usermodel.User{
		{Email: "admin@littleroyals.school", PasswordHash: hash, Name: "School Admin", Role: usermodel.RoleAdmin, Status: "Active"},
		{Email: "teacher@littleroyals.school", PasswordHash: hash, Name: "Ada Teacher", Role: usermodel.RoleTeacher, Status: "Active"},
		{Email: "parent@littleroyals.school", PasswordHash: hash, Name: "Sam Parent", Role: usermodel.RoleParent, Status: "Active"},
		{Email: "accountant@littleroyals.school", PasswordHash: hash, Name: "Finance Officer", Role: usermodel.RoleAccountant, Status: "Active"},
	}
	for i := range users {
		if err := db.Create(&users[i]).Error; err != nil {
			return fmt.Errorf("seed user: %w", err)
		}
	}

	credPath := filepath.Join(".", ".admin-credentials")
	body := fmt.Sprintf(
		"email=admin@littleroyals.school\npassword=%s\n# Generated once on first seed. Do not commit.\n",
		plain,
	)
	if err := os.WriteFile(credPath, []byte(body), 0o600); err != nil {
		log.Warn("could not write .admin-credentials", zap.Error(err))
	} else {
		log.Info("admin bootstrap credentials written", zap.String("path", credPath))
	}

	students := []studentmodel.Student{
		{AdmissionNo: "LR-2024-001", FirstName: "Amina", LastName: "Namukasa", ClassName: "P.5 Blue", Program: "Primary", Status: "Active", Guardian: "Hassan Namukasa"},
		{AdmissionNo: "LR-2024-002", FirstName: "James", LastName: "Okello", ClassName: "P.6 Green", Program: "Primary", Status: "Active", Guardian: "Mary Okello"},
		{AdmissionNo: "LR-2024-003", FirstName: "Sarah", LastName: "Nabukeera", ClassName: "Top Class A", Program: "Nursery", Status: "Active", Guardian: "Paul Nabukeera"},
	}
	for i := range students {
		if err := db.Create(&students[i]).Error; err != nil {
			return err
		}
	}

	staff := []staffmodel.Staff{
		{StaffNo: "TCH-201", FirstName: "Grace", LastName: "Namuli", RoleTitle: "Teacher", Subject: "Mathematics", Department: "Primary", Status: "Active", Email: "teacher@littleroyals.school"},
		{StaffNo: "TCH-202", FirstName: "Peter", LastName: "Okello", RoleTitle: "Teacher", Subject: "English", Department: "Primary", Status: "Active"},
	}
	for i := range staff {
		if err := db.Create(&staff[i]).Error; err != nil {
			return err
		}
	}

	parents := []parentmodel.Parent{
		{FirstName: "Hassan", LastName: "Namukasa", Relation: "Father", Phone: "+256701111111", Status: "Active"},
		{FirstName: "Mary", LastName: "Okello", Relation: "Mother", Phone: "+256702222222", Status: "Active"},
	}
	for i := range parents {
		if err := db.Create(&parents[i]).Error; err != nil {
			return err
		}
	}

	classes := []classmodel.Class{
		{Name: "Baby Class A", Level: "Nursery", Stream: "A", Teacher: "Joy Akello", Status: "Active"},
		{Name: "P.5 Blue", Level: "Primary", Stream: "Blue", Teacher: "Grace Namuli", Status: "Active"},
		{Name: "P.7 Gold", Level: "Primary", Stream: "Gold", Teacher: "Peter Okello", Status: "Active"},
	}
	for i := range classes {
		if err := db.Create(&classes[i]).Error; err != nil {
			return err
		}
	}

	subjects := []subjectmodel.Subject{
		{Name: "English", Code: "ENG", Program: "Primary", PeriodsPerWeek: 8, Instructor: "Peter Okello", Status: "Active"},
		{Name: "Mathematics", Code: "MATH", Program: "Primary", PeriodsPerWeek: 8, Instructor: "Grace Namuli", Status: "Active"},
		{Name: "Science", Code: "SCI", Program: "Primary", PeriodsPerWeek: 6, Status: "Active"},
	}
	for i := range subjects {
		if err := db.Create(&subjects[i]).Error; err != nil {
			return err
		}
	}

	fees := []feemodel.FeeStructure{
		{Name: "Nursery Term Fees", Program: "Nursery", Term: "Term 1", Amount: 350000, Status: "Active"},
		{Name: "Primary Term Fees", Program: "Primary", Term: "Term 1", Amount: 450000, Status: "Active"},
	}
	for i := range fees {
		if err := db.Create(&fees[i]).Error; err != nil {
			return err
		}
	}

	return nil
}

func randomPassword(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b)[:n], nil
}
