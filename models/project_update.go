package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProjectUpdate struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
	Project     Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Link        string         `gorm:"size:512" json:"link"`
	CreatedBy   uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	Author      User           `gorm:"foreignKey:CreatedBy" json:"author,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (pu *ProjectUpdate) BeforeCreate(tx *gorm.DB) error {
	pu.ID = uuid.New()
	return nil
}

type ProjectComment struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UpdateID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"update_id"`
	UserID     uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	User       User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Content    string         `gorm:"type:text;not null" json:"content" binding:"required"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (pc *ProjectComment) BeforeCreate(tx *gorm.DB) error {
	pc.ID = uuid.New()
	return nil
}
