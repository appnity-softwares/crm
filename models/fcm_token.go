package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FCMToken stores Firebase Cloud Messaging device tokens for push notifications.
type FCMToken struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;index;not null" json:"user_id"`
	Token     string         `gorm:"size:500;uniqueIndex;not null" json:"token"`
	Device    string         `gorm:"size:100" json:"device"` // web, android, ios
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
