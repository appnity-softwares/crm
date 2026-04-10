package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ActivityLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type      string    `gorm:"size:50" json:"type"` // login, checkin, payment, lead_update, project_update
	Action    string    `gorm:"size:255" json:"action"`
	Details   string    `gorm:"type:text" json:"details"`
	CreatedAt time.Time `json:"created_at"`
}

func (al *ActivityLog) BeforeCreate(tx *gorm.DB) error {
	al.ID = uuid.New()
	return nil
}

// LogActivity is a helper to record actions
func LogActivity(tx *gorm.DB, userID uuid.UUID, logType, action, details string) {
	log := ActivityLog{
		UserID:  userID,
		Type:    logType,
		Action:  action,
		Details: details,
	}
	tx.Create(&log)
}
