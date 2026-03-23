package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChatPermission struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ClientID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"client_id"`
	Client    User           `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ProjectID uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
	Project   Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Status    string         `gorm:"size:50;not null;default:'requested'" json:"status" binding:"omitempty,oneof=requested approved rejected"`
	ApprovedBy *uuid.UUID    `gorm:"type:uuid" json:"approved_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (cp *ChatPermission) BeforeCreate(tx *gorm.DB) error {
	cp.ID = uuid.New()
	return nil
}
