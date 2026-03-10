package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Leave struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	LeaveType   string         `gorm:"size:50;not null" json:"leave_type" binding:"required,oneof=sick casual paid other"`
	StartDate   time.Time      `gorm:"type:date;not null" json:"start_date" binding:"required"`
	EndDate     time.Time      `gorm:"type:date;not null" json:"end_date" binding:"required"`
	Reason      string         `gorm:"type:text;not null" json:"reason" binding:"required"`
	Status      string         `gorm:"size:50;not null;default:'pending'" json:"status" binding:"omitempty,oneof=pending approved rejected"`
	AdminRemark string         `gorm:"type:text" json:"admin_remark"`
	ReviewedBy  *uuid.UUID     `gorm:"type:uuid" json:"reviewed_by"`
	Reviewer    *User          `gorm:"foreignKey:ReviewedBy" json:"reviewer,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (l *Leave) BeforeCreate(tx *gorm.DB) error {
	l.ID = uuid.New()
	return nil
}
