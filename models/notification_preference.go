package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NotificationPreference stores per-user, per-type delivery channel preferences.
type NotificationPreference struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;uniqueIndex:idx_user_type;not null" json:"user_id"`
	Type      string         `gorm:"size:50;uniqueIndex:idx_user_type;not null" json:"type"`
	InApp     bool           `gorm:"default:true" json:"in_app"`
	Push      bool           `gorm:"default:true" json:"push"`
	Email     bool           `gorm:"default:false" json:"email"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (n *NotificationPreference) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}
