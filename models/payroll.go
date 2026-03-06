package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Payroll struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Month       int            `gorm:"not null" json:"month" binding:"required,min=1,max=12"`
	Year        int            `gorm:"not null" json:"year" binding:"required,min=2020"`
	BasicSalary float64        `gorm:"type:decimal(12,2);not null" json:"basic_salary" binding:"required"`
	Bonus       float64        `gorm:"type:decimal(12,2);default:0" json:"bonus"`
	Deductions  float64        `gorm:"type:decimal(12,2);default:0" json:"deductions"`
	NetSalary   float64        `gorm:"type:decimal(12,2);not null" json:"net_salary"`
	Status      string         `gorm:"size:50;not null;default:'pending'" json:"status" binding:"omitempty,oneof=pending paid"`
	PaidAt      *time.Time     `json:"paid_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (p *Payroll) BeforeCreate(tx *gorm.DB) error {
	p.ID = uuid.New()
	p.NetSalary = p.BasicSalary + p.Bonus - p.Deductions
	return nil
}

func (p *Payroll) CalculateNetSalary() {
	p.NetSalary = p.BasicSalary + p.Bonus - p.Deductions
}
