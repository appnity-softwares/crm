package models

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name" binding:"required"`
	Email       string         `gorm:"size:255;uniqueIndex;not null" json:"email" binding:"required,email"`
	Password    string         `gorm:"size:255;not null" json:"-"`
	Role        string         `gorm:"size:50;not null;default:'prospect'" json:"role" binding:"required,oneof=admin manager employee client prospect"`
	Department  string         `gorm:"size:255" json:"department"`
	Designation string         `gorm:"size:255" json:"designation"`
	Phone       string         `gorm:"size:20" json:"phone"`
	Permissions string         `gorm:"type:text" json:"permissions"` // Comma-separated or JSON
	Avatar      string         `gorm:"size:1000" json:"avatar"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	u.ID = uuid.New()
	return nil
}

func (u *User) HashPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}
