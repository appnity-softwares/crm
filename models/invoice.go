package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Invoice struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	InvoiceNumber string         `gorm:"size:50;uniqueIndex;not null" json:"invoice_number"`
	ClientName    string         `gorm:"size:255;not null" json:"client_name" binding:"required"`
	ClientEmail   string         `gorm:"size:255" json:"client_email" binding:"omitempty,email"`
	ProjectID     *uuid.UUID     `gorm:"type:uuid;index" json:"project_id"`
	Project       *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Amount        float64        `gorm:"type:decimal(12,2);not null" json:"amount" binding:"required"`
	Tax           float64        `gorm:"type:decimal(12,2);default:0" json:"tax"`
	Total         float64        `gorm:"type:decimal(12,2);not null" json:"total"`
	PaidAmount    float64        `gorm:"type:decimal(12,2);default:0" json:"paid_amount"`
	Status        string         `gorm:"size:50;not null;default:'draft'" json:"status" binding:"omitempty,oneof=draft sent paid overdue partial"`
	DueDate       time.Time      `gorm:"type:date;not null" json:"due_date"`
	IssuedAt      time.Time      `gorm:"not null" json:"issued_at"`
	SecureToken   string         `gorm:"size:100;uniqueIndex" json:"secure_token"`
	RazorpayOrder string         `gorm:"size:100" json:"razorpay_order_id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (i *Invoice) BeforeCreate(tx *gorm.DB) error {
	i.ID = uuid.New()
	i.Total = i.Amount + i.Tax
	if i.IssuedAt.IsZero() {
		i.IssuedAt = time.Now()
	}

	if i.SecureToken == "" {
		i.SecureToken = uuid.New().String()
	}

	// Auto-generate invoice number: INV-YYYYMMDD-XXXX
	var count int64
	tx.Model(&Invoice{}).Count(&count)
	i.InvoiceNumber = fmt.Sprintf("INV-%s-%04d", time.Now().Format("20060102"), count+1)

	return nil
}

func (i *Invoice) CalculateTotal() {
	i.Total = i.Amount + i.Tax
}
