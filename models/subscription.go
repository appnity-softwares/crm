package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Subscription struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ClientID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"client_id"`
	Client        User           `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	ProjectID     *uuid.UUID     `gorm:"type:uuid;index" json:"project_id"`
	Project       *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Name          string         `gorm:"size:255;not null" json:"name"`
	Amount        float64        `gorm:"not null" json:"amount"`
	Interval      string         `gorm:"size:20;default:'monthly'" json:"interval"` // monthly, yearly
	NextBillingAt time.Time      `json:"next_billing_at"`
	Status        string         `gorm:"size:20;default:'active'" json:"status"` // active, cancelled, expired
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *Subscription) BeforeCreate(tx *gorm.DB) error {
	s.ID = uuid.New()
	if s.NextBillingAt.IsZero() {
		// Default to 1 month from now
		s.NextBillingAt = time.Now().AddDate(0, 1, 0)
	}
	return nil
}
