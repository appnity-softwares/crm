package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DailyReport struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Date        string         `gorm:"type:varchar(20);not null" json:"date"`
	Metrics     string         `gorm:"type:jsonb" json:"metrics"`
	Notes       string         `gorm:"type:text" json:"notes"`
	Status      string         `gorm:"type:varchar(50);default:'submitted'" json:"status"` // submitted, approved, rejected
	AdminRemark string         `gorm:"type:text" json:"admin_remark"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (d *DailyReport) BeforeCreate(tx *gorm.DB) error {
	d.ID = uuid.New()
	return nil
}
