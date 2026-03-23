package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Course struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Syllabus    string         `gorm:"type:text" json:"syllabus"` // GFM format
	Duration    int            `json:"duration"` // in days
	TotalFee    float64        `json:"total_fee"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *Course) BeforeCreate(tx *gorm.DB) error {
	c.ID = uuid.New()
	return nil
}

type Enrollment struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	StudentID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"student_id"`
	Student        User           `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	CourseID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"course_id"`
	Course         Course         `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	Status         string         `gorm:"size:50;default:'active'" json:"status"` // active, completed, dropped
	StartDate      time.Time      `json:"start_date"`
	EndDate        *time.Time     `json:"end_date"`
	CompletedTopic string         `gorm:"type:text" json:"completed_topic"` // JSON or text
	CertLink       string         `gorm:"size:1000" json:"cert_link"`
	OfferLink      string         `gorm:"size:1000" json:"offer_link"`
	TotalFee       float64        `json:"total_fee"`
	PaidAmount     float64        `gorm:"default:0" json:"paid_amount"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (e *Enrollment) BeforeCreate(tx *gorm.DB) error {
	e.ID = uuid.New()
	return nil
}
