package database

import (
	"log"
	"os"

	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := config.AppConfig.GetDSN()

	// Use appropriate log level based on environment
	logLevel := logger.Info
	if os.Getenv("GIN_MODE") == "release" {
		logLevel = logger.Warn
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	log.Println("✅ Database connected successfully")

	err = DB.AutoMigrate(
		&models.User{},
		&models.Attendance{},
		&models.WorkLog{},
		&models.WorkLogUpdate{},
		&models.Project{},
		&models.ProjectAssignment{},
		&models.ProjectTransfer{},
		&models.Payroll{},
		&models.Invoice{},
		&models.Lead{},
		&models.DailyReport{},
		&models.FeatureFlag{},
		&models.Notification{},
		&models.NotificationPreference{},
		&models.Expense{},
		&models.CompanyBalance{},
		&models.BalanceLog{},
		&models.Leave{},
		&models.Notice{},
		&models.Message{},
		&models.Task{},
		&models.Ticket{},
		&models.Income{},
		&models.ChatPermission{},
		&models.ProjectUpdate{},
		&models.ProjectComment{},
		&models.Course{}, &models.Enrollment{}, &models.Job{},
	)
	if err != nil {
		log.Fatal("❌ Failed to auto-migrate:", err)
	}

	log.Println("✅ Database migrated successfully")
}

func SeedAdmin() {
	var count int64
	DB.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	if count == 0 {
		// Use env password if provided, otherwise use a secure default
		adminPassword := os.Getenv("ADMIN_SEED_PASSWORD")
		if adminPassword == "" {
			adminPassword = "ChangeMe!Admin@2026"
		}

		adminEmail := os.Getenv("ADMIN_SEED_EMAIL")
		if adminEmail == "" {
			adminEmail = "admin@erp.com"
		}

		admin := models.User{
			Name:        "Admin",
			Email:       adminEmail,
			Role:        "admin",
			Department:  "Management",
			Designation: "System Administrator",
			IsActive:    true,
		}
		admin.HashPassword(adminPassword)

		if err := DB.Create(&admin).Error; err != nil {
			log.Fatal("❌ Failed to seed admin user:", err)
		}
		log.Printf("✅ Admin user seeded (%s) — CHANGE PASSWORD IMMEDIATELY", adminEmail)
	} else {
		log.Println("ℹ️  Admin user already exists, skipping seed")
	}
}

func SeedConfigs() {
	flags := []models.FeatureFlag{
		{Name: "Restrict Attendance to QR Only", Key: "attendance_qr_only", Enabled: true},
		{Name: "Enable Manual Attendance", Key: "manual_attendance", Enabled: true},
		{Name: "Show Performance Analytics", Key: "performance_dashboard", Enabled: false},
	}

	for _, f := range flags {
		var existing models.FeatureFlag
		if err := DB.Where("key = ?", f.Key).First(&existing).Error; err != nil {
			DB.Create(&f)
		}
	}
	log.Println("✅ Feature flags seeded/updated")
}
