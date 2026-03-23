package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Income struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Source      string         `gorm:"size:255;not null" json:"source" binding:"required"`
	Amount      float64        `gorm:"not null" json:"amount" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Category    string         `gorm:"size:100;default:'others'" json:"category"`
	Date        time.Time      `gorm:"type:date;not null" json:"date" binding:"required"`
	ProjectID    *uuid.UUID     `gorm:"type:uuid" json:"project_id"`
	Project      *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	EnrollmentID *uuid.UUID     `gorm:"type:uuid" json:"enrollment_id"`
	Enrollment   *Enrollment    `gorm:"foreignKey:EnrollmentID" json:"enrollment,omitempty"`
	CreatedBy   uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (i *Income) BeforeCreate(tx *gorm.DB) error {
	i.ID = uuid.New()
	return nil
}
