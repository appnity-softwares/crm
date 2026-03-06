package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;index" json:"user_id"`
	Type      string         `gorm:"size:20" json:"type"` // info, success, warning, error
	Title     string         `gorm:"size:100" json:"title"`
	Message   string         `gorm:"type:text" json:"message"`
	Read      bool           `gorm:"default:false" json:"read"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
