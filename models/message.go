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
	IsCritical       bool           `gorm:"default:false" json:"is_critical"`
	IsPinned         bool           `gorm:"default:false" json:"is_pinned"`
	ParentID         *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id"`
	Parent           *Message       `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	HiddenForSender   bool           `gorm:"default:false" json:"hidden_for_sender"`
	HiddenForReceiver bool           `gorm:"default:false" json:"hidden_for_receiver"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	
	Reactions   []MessageReaction `gorm:"foreignKey:MessageID" json:"reactions,omitempty"`
}

type MessageReaction struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	MessageID uuid.UUID `gorm:"type:uuid;not null;index" json:"message_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Emoji     string    `gorm:"size:10;not null" json:"emoji"`
	CreatedAt time.Time `json:"created_at"`
}

func (mr *MessageReaction) BeforeCreate(tx *gorm.DB) error {
	mr.ID = uuid.New()
	return nil
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	m.ID = uuid.New()
	if m.Status == "" {
		m.Status = "sent"
	}
	return nil
}
