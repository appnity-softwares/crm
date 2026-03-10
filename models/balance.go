package models

import "gorm.io/gorm"

type CompanyBalance struct {
	gorm.Model
	TotalBalance  float64 `json:"total_balance"`
	LastUpdatedBy uint    `json:"last_updated_by"`
}

type BalanceLog struct {
	gorm.Model
	Amount    float64 `json:"amount"`
	Type      string  `json:"type"` // "income", "expense", "manual"
	Reference string  `json:"reference"`
	Notes     string  `json:"notes"`
}
