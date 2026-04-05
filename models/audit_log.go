package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action    string    `gorm:"size:50" json:"action"`     // e.g., "create", "update", "delete", "view"
	Module    string    `gorm:"size:50" json:"module"`     // e.g., "income", "lead", "project"
	TargetID  string    `gorm:"size:100" json:"target_id"` // ID of the object being acted upon
	Changes   string    `gorm:"type:text" json:"changes"`  // JSON string or description of changes
	IPAddress string    `gorm:"size:45" json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
}

func (al *AuditLog) BeforeCreate(tx *gorm.DB) error {
	al.ID = uuid.New()
	return nil
}
