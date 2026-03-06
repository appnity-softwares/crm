package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FeatureFlag struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string    `gorm:"unique;not null" json:"name"`
	Key       string    `gorm:"unique;not null" json:"key"` // e.g. "attendance_qr_only"
	Enabled   bool      `gorm:"default:false" json:"enabled"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (f *FeatureFlag) BeforeCreate(tx *gorm.DB) error {
	f.ID = uuid.New()
	return nil
}
