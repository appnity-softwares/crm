package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Attendance struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Date      time.Time      `gorm:"type:date;not null" json:"date"`
	CheckIn   time.Time      `gorm:"not null" json:"check_in"`
	CheckOut  *time.Time     `json:"check_out"`
	Status    string         `gorm:"size:50;not null;default:'present'" json:"status" binding:"omitempty,oneof=present absent half_day leave"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (a *Attendance) BeforeCreate(tx *gorm.DB) error {
	a.ID = uuid.New()
	return nil
}
