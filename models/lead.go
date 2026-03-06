package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Lead struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name       string         `gorm:"size:255;not null" json:"name" binding:"required"`
	Email      string         `gorm:"size:255" json:"email" binding:"omitempty,email"`
	Phone      string         `gorm:"size:20" json:"phone"`
	Company    string         `gorm:"size:255" json:"company"`
	Source     string         `gorm:"size:50;default:'other'" json:"source" binding:"omitempty,oneof=website referral social other"`
	Status     string         `gorm:"size:50;not null;default:'new'" json:"status" binding:"omitempty,oneof=new contacted qualified proposal won lost"`
	AssignedTo *uuid.UUID     `gorm:"type:uuid;index" json:"assigned_to"`
	Assignee   *User          `gorm:"foreignKey:AssignedTo" json:"assignee,omitempty"`
	Notes      string         `gorm:"type:text" json:"notes"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (l *Lead) BeforeCreate(tx *gorm.DB) error {
	l.ID = uuid.New()
	return nil
}
