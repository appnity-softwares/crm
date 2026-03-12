package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DBHost                 string
	DBPort                 string
	DBUser                 string
	DBPassword             string
	DBName                 string
	JWTSecret              string
	JWTRefreshSecret       string
	RazorpayKeyID          string
	RazorpayKeySecret      string
	CloudinaryCloudName    string
	CloudinaryUploadPreset string
}

var AppConfig *Config

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	AppConfig = &Config{
		Port:                   getEnv("PORT", "8080"),
		DBHost:                 getEnv("DB_HOST", "localhost"),
		DBPort:                 getEnv("DB_PORT", "5432"),
		DBUser:                 getEnv("DB_USER", "postgres"),
		DBPassword:             getEnv("DB_PASSWORD", "postgres"),
		DBName:                 getEnv("DB_NAME", "erp_crm"),
		JWTSecret:              getEnv("JWT_SECRET", ""),
		JWTRefreshSecret:       getEnv("JWT_REFRESH_SECRET", ""),
		RazorpayKeyID:          getEnv("RAZORPAY_KEY_ID", ""),
		RazorpayKeySecret:      getEnv("RAZORPAY_KEY_SECRET", ""),
		CloudinaryCloudName:    getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryUploadPreset: getEnv("CLOUDINARY_UPLOAD_PRESET", ""),
	}

	// Enforce critical secrets in production
	if os.Getenv("GIN_MODE") == "release" {
		if AppConfig.JWTSecret == "" || AppConfig.JWTRefreshSecret == "" {
			log.Fatal("❌ FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in production mode")
		}
		if AppConfig.RazorpayKeyID == "" || AppConfig.RazorpayKeySecret == "" {
			log.Println("⚠️ Warning: Razorpay credentials missing. Payments will fail.")
		}
	} else {
		// Set defaults for development if empty
		if AppConfig.JWTSecret == "" {
			AppConfig.JWTSecret = "dev-secret-key-change-me"
		}
		if AppConfig.JWTRefreshSecret == "" {
			AppConfig.JWTRefreshSecret = "dev-refresh-secret-key-change-me"
		}
	}

	log.Println("✅ Configuration loaded successfully")
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func (c *Config) GetDSN() string {
	dsn := fmt.Sprintf(
		"host=%s user=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Kolkata",
		c.DBHost, c.DBUser, c.DBName, c.DBPort,
	)
	if c.DBPassword != "" {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Kolkata",
			c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort,
		)
	}
	return dsn
}
