package database

import (
	"log"

	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := config.AppConfig.GetDSN()

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	log.Println("✅ Database connected successfully")

	err = DB.AutoMigrate(
		&models.User{},
		&models.Attendance{},
		&models.WorkLog{},
		&models.Project{},
		&models.ProjectAssignment{},
		&models.ProjectTransfer{},
		&models.Payroll{},
		&models.Invoice{},
		&models.Lead{},
		&models.DailyReport{},
		&models.FeatureFlag{},
		&models.Notification{},
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
		admin := models.User{
			Name:        "Admin",
			Email:       "admin@erp.com",
			Role:        "admin",
			Department:  "Management",
			Designation: "System Administrator",
			Phone:       "+91 6267935314",
			IsActive:    true,
		}
		admin.HashPassword("admin123")

		if err := DB.Create(&admin).Error; err != nil {
			log.Fatal("❌ Failed to seed admin user:", err)
		}
		log.Println("✅ Admin user seeded (admin@erp.com / admin123)")
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
