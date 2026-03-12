package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkLog struct {
	ID          uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID       `gorm:"type:uuid;not null;index" json:"user_id"`
	User        User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ProjectID   *uuid.UUID      `gorm:"type:uuid;index" json:"project_id"`
	Project     *Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Date        time.Time       `gorm:"type:date;not null" json:"date"`
	Hours       float64         `gorm:"not null" json:"hours" binding:"required,gt=0"`
	Description string          `gorm:"type:text;not null" json:"description" binding:"required"`
	IsEdited    bool            `gorm:"default:false" json:"is_edited"`
	History     []WorkLogUpdate `gorm:"foreignKey:WorkLogID" json:"history,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`
}

type WorkLogUpdate struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	WorkLogID   uuid.UUID `gorm:"type:uuid;not null;index" json:"work_log_id"`
	OldContent  string    `gorm:"type:text" json:"old_content"`
	NewContent  string    `gorm:"type:text" json:"new_content"`
	OldHours    float64   `json:"old_hours"`
	NewHours    float64   `json:"new_hours"`
	UpdatedBy   uuid.UUID `gorm:"type:uuid;not null" json:"updated_by"`
	Updater     User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (w *WorkLog) BeforeCreate(tx *gorm.DB) error {
	w.ID = uuid.New()
	return nil
}

func (w *WorkLogUpdate) BeforeCreate(tx *gorm.DB) error {
	w.ID = uuid.New()
	return nil
}
