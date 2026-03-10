package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Expense struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Amount      float64        `gorm:"not null" json:"amount" binding:"required"`
	Date        time.Time      `gorm:"not null" json:"date" binding:"required"`
	Category    string         `gorm:"size:100;default:'other'" json:"category"`
	AddedBy     uuid.UUID      `gorm:"type:uuid" json:"added_by"`
	User        User           `gorm:"foreignKey:AddedBy" json:"user"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (e *Expense) BeforeCreate(tx *gorm.DB) error {
	e.ID = uuid.New()
	return nil
}
