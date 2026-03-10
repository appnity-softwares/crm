package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Ticket struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
	Project     Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Subject     string         `gorm:"size:255;not null" json:"subject" binding:"required"`
	Description string         `gorm:"type:text;not null" json:"description" binding:"required"`
	Status      string         `gorm:"size:50;default:'open'" json:"status" binding:"oneof=open in_progress closed"`
	Priority    string         `gorm:"size:50;default:'medium'" json:"priority" binding:"oneof=low medium high"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (t *Ticket) BeforeCreate(tx *gorm.DB) error {
	t.ID = uuid.New()
	return nil
}
