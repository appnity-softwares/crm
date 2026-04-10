package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"github.com/pushp314/erp-crm/utils"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GetBalance(c *gin.Context) {
	role, _ := c.Get("user_role")
	perms, _ := c.Get("user_permissions")
	if role != "admin" && role != "manager" && !utils.ContainsPermission(perms.(string), "finance") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var balance models.CompanyBalance
	result := database.DB.First(&balance)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Initialize if not exists
			balance = models.CompanyBalance{TotalBalance: 0}
			database.DB.Create(&balance)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch balance"})
			return
		}
	}
	c.JSON(http.StatusOK, balance)
}

func GetFinanceStats(c *gin.Context) {
	role, _ := c.Get("user_role")
	perms, _ := c.Get("user_permissions")
	if role != "admin" && role != "manager" && !utils.ContainsPermission(perms.(string), "finance") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var totalIncome float64
	var totalExpense float64

	// Total Paid Invoices — use COALESCE to avoid NULL scan
	database.DB.Model(&models.Invoice{}).Where("status = ?", "paid").Select("COALESCE(SUM(total_amount), 0)").Scan(&totalIncome)

	// Total Expenses
	database.DB.Model(&models.Expense{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense)

	// Simple GST estimation (assuming 18% GST in India for services)
	gstIncome := totalIncome * 0.18
	gstExpense := totalExpense * 0.18
	gstNet := gstIncome - gstExpense

	profit := totalIncome - totalExpense

	// Monthly Breakdown for Profit/Loss (last 6 months)
	type MonthlyData struct {
		Month   string  `json:"month"`
		Income  float64 `json:"income"`
		Expense float64 `json:"expense"`
	}
	var chartData []MonthlyData
	for i := 5; i >= 0; i-- {
		start := time.Now().AddDate(0, -i, -time.Now().Day()+1).Truncate(24 * time.Hour)
		end := start.AddDate(0, 1, -1)

		var incSum, expSum float64
		database.DB.Model(&models.Invoice{}).Where("status = ? AND updated_at BETWEEN ? AND ?", "paid", start, end).Select("COALESCE(SUM(total_amount), 0)").Scan(&incSum)
		database.DB.Model(&models.Expense{}).Where("date BETWEEN ? AND ?", start, end).Select("COALESCE(SUM(amount), 0)").Scan(&expSum)

		chartData = append(chartData, MonthlyData{
			Month:   start.Format("Jan"),
			Income:  incSum,
			Expense: expSum,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_income":  totalIncome,
		"total_expense": totalExpense,
		"net_profit":    profit,
		"gst_payable":   gstNet,
		"history":       chartData,
	})
}

func UpdateBalanceManual(c *gin.Context) {
	var input struct {
		Amount float64 `json:"amount" binding:"required"`
		Notes  string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var balance models.CompanyBalance
		if err := tx.First(&balance).Error; err != nil {
			balance = models.CompanyBalance{TotalBalance: 0}
			if err := tx.Create(&balance).Error; err != nil {
				return err
			}
		}

		balance.TotalBalance += input.Amount
		balance.LastUpdatedBy = &uid
		if err := tx.Save(&balance).Error; err != nil {
			return err
		}

		log := models.BalanceLog{
			Amount:    input.Amount,
			Type:      "manual",
			Reference: "Manual Update",
			Notes:     input.Notes,
		}
		return tx.Create(&log).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update balance"})
		return
	}

	GetBalance(c)
}

// SafeAdjustBalance ensures a financial transaction is conditionally executed exactly ONCE
// and prevents Read/Write logical race conditions via Row-Level Locking.
func SafeAdjustBalance(tx *gorm.DB, amount float64, logType, referenceID, notes string) error {
	if amount == 0 {
		return nil
	}

	// 1. Idempotency Check: Did we already process this exact reference ID?
	var existingLog models.BalanceLog
	err := tx.Where("reference = ?", referenceID).First(&existingLog).Error
	if err == nil {
		return nil // Transaction processed previously. Safe silent return.
	} else if err != gorm.ErrRecordNotFound {
		return err // Real database error
	}

	// 2. Pessimistic Locking (SELECT ... FOR UPDATE) to prevent concurrency overrides
	var balance models.CompanyBalance
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&balance).Error; err != nil {
		balance = models.CompanyBalance{TotalBalance: 0}
		if err := tx.Create(&balance).Error; err != nil {
			return err
		}
	}

	balance.TotalBalance += amount
	if err := tx.Save(&balance).Error; err != nil {
		return err
	}

	log := models.BalanceLog{
		Amount:    amount,
		Type:      logType,
		Reference: referenceID,
		Notes:     notes,
	}
	return tx.Create(&log).Error
}
