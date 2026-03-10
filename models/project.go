package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Project struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name            string         `gorm:"size:255;not null" json:"name" binding:"required"`
	Description     string         `gorm:"type:text" json:"description"`
	Status          string         `gorm:"size:50;not null;default:'planning'" json:"status" binding:"omitempty,oneof=planning active on_hold completed"`
	Progress        int            `gorm:"default:0" json:"progress"`
	PendingProgress *int           `gorm:"default:null" json:"pending_progress"`
	PortalToken     string         `gorm:"size:100;uniqueIndex" json:"client_portal_token"`
	StartDate       time.Time      `gorm:"type:date" json:"start_date"`
	EndDate         *time.Time     `gorm:"type:date" json:"end_date"`
	ClientID        *uuid.UUID     `gorm:"type:uuid;index" json:"client_id"`
	Client          *User          `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	CreatedBy       uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	Creator         User           `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	Assignments []ProjectAssignment `gorm:"foreignKey:ProjectID" json:"assignments,omitempty"`
	Transfers   []ProjectTransfer   `gorm:"foreignKey:ProjectID" json:"transfers,omitempty"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	p.ID = uuid.New()
	if p.PortalToken == "" {
		p.PortalToken = uuid.New().String()
	}
	return nil
}

type ProjectAssignment struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
	Project    Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	UserID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User       User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role       string         `gorm:"size:50;not null;default:'member'" json:"role" binding:"omitempty,oneof=lead member"`
	AssignedAt time.Time      `gorm:"not null" json:"assigned_at"`
	RemovedAt  *time.Time     `json:"removed_at"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (pa *ProjectAssignment) BeforeCreate(tx *gorm.DB) error {
	pa.ID = uuid.New()
	if pa.AssignedAt.IsZero() {
		pa.AssignedAt = time.Now()
	}
	return nil
}

type ProjectTransfer struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"project_id"`
	Project       Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	FromUserID    uuid.UUID      `gorm:"type:uuid;not null" json:"from_user_id"`
	FromUser      User           `gorm:"foreignKey:FromUserID" json:"from_user,omitempty"`
	ToUserID      uuid.UUID      `gorm:"type:uuid;not null" json:"to_user_id"`
	ToUser        User           `gorm:"foreignKey:ToUserID" json:"to_user,omitempty"`
	Reason        string         `gorm:"type:text" json:"reason"`
	TransferredAt time.Time      `gorm:"not null" json:"transferred_at"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (pt *ProjectTransfer) BeforeCreate(tx *gorm.DB) error {
	pt.ID = uuid.New()
	if pt.TransferredAt.IsZero() {
		pt.TransferredAt = time.Now()
	}
	return nil
}
