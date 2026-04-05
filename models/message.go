package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	SenderID    *uuid.UUID     `gorm:"type:uuid;not null;index" json:"sender_id"`
	Sender      User           `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	ReceiverID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"receiver_id"`
	Receiver    User           `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	Type        string         `gorm:"size:20;default:'text'" json:"type"` // text, image, link
	Status           string         `gorm:"size:20;default:'sent'" json:"status"` // sent, delivered, seen
	IsEdited         bool           `gorm:"default:false" json:"is_edited"`
	HiddenForSender   bool           `gorm:"default:false" json:"hidden_for_sender"`
	HiddenForReceiver bool           `gorm:"default:false" json:"hidden_for_receiver"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	m.ID = uuid.New()
	if m.Status == "" {
		m.Status = "sent"
	}
	return nil
}
