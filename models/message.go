package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	SenderID   *uuid.UUID     `gorm:"type:uuid;not null;index" json:"sender_id,omitempty"`
	Sender     User           `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	ReceiverID uuid.UUID      `gorm:"type:uuid;not null;index" json:"receiver_id" binding:"required"`
	Receiver   User           `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
	Content    string         `gorm:"type:text;not null" json:"content" binding:"required"`
	IsRead     bool           `gorm:"default:false" json:"is_read"`
	CreatedAt  time.Time      `json:"created_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	m.ID = uuid.New()
	return nil
}
