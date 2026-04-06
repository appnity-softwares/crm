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
	Status     string         `gorm:"size:50;not null;default:'new'" json:"status" binding:"omitempty,oneof=new in_review quotation_sent negotiation won lost contacted qualified proposal"`
	AssignedTo *uuid.UUID     `gorm:"type:uuid;index" json:"assigned_to"`
	Assignee   *User          `gorm:"foreignKey:AssignedTo" json:"assignee,omitempty"`
	AddedByID  uuid.UUID      `gorm:"type:uuid;index" json:"added_by_id"`
	AddedBy    *User          `gorm:"foreignKey:AddedByID" json:"added_by,omitempty"`
	UserID     *uuid.UUID     `gorm:"type:uuid;index" json:"user_id"`
	User       *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Notes              string         `gorm:"type:text" json:"notes"`
	Description        string         `gorm:"type:text" json:"description"`
	Type               string         `gorm:"size:50;default:'outbound'" json:"type" binding:"omitempty,oneof=direct outbound"`
	SOW                string         `gorm:"type:text" json:"sow"`
	SOWAccepted        bool           `gorm:"default:false" json:"sow_accepted"`
	SOWAcceptedAt      *time.Time     `json:"sow_accepted_at"`
	AdvancePaidConfirm bool           `gorm:"default:false" json:"advance_paid_confirm"`
	SecureToken        string         `gorm:"size:100;uniqueIndex" json:"secure_token"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

func (l *Lead) BeforeCreate(tx *gorm.DB) error {
	l.ID = uuid.New()
	if l.SecureToken == "" {
		l.SecureToken = uuid.New().String()
	}
	return nil
}
