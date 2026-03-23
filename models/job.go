package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Job struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Company     string         `gorm:"size:255;not null" json:"company" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Location    string         `gorm:"size:255" json:"location"`
	Salary      string         `gorm:"size:255" json:"salary"`
	Type        string         `gorm:"size:50;default:'full-time'" json:"type"` // full-time, part-time, internship
	Status      string         `gorm:"size:50;default:'open'" json:"status"`    // open, closed
	Deadline    *time.Time     `json:"deadline"`
	PostedBy    uuid.UUID      `gorm:"type:uuid" json:"posted_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (j *Job) BeforeCreate(tx *gorm.DB) error {
	j.ID = uuid.New()
	return nil
}
