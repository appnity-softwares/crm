package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notice struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Title     string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Content   string         `gorm:"type:text;not null" json:"content" binding:"required"`
	Type      string         `gorm:"size:50;default:'general'" json:"type" binding:"oneof=general holiday event win"`
	CreatedBy uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	Author    User           `gorm:"foreignKey:CreatedBy" json:"author,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (n *Notice) BeforeCreate(tx *gorm.DB) error {
	n.ID = uuid.New()
	return nil
}
