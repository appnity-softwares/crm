package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"gorm.io/gorm"
)

func GetBalance(c *gin.Context) {
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
	var totalIncome float64
	var totalExpense float64

	// Total Paid Invoices
	database.DB.Model(&models.Invoice{}).Where("status = ?", "paid").Select("SUM(total_amount)").Row().Scan(&totalIncome)

	// Total Expenses
	database.DB.Model(&models.Expense{}).Select("SUM(amount)").Row().Scan(&totalExpense)

	// Simple GST estimation (assuming 18% GST in India for services)
	// GST Payable = (Income * 18/118) - (Expense * 18/118) -- if prices are inclusive
	// Or simply Income * 0.18 -- if prices are exclusive.
	// Let's assume income/expense recorded is the base amount for simplicity of reporting.
	gstIncome := totalIncome * 0.18
	gstExpense := totalExpense * 0.18
	gstNet := gstIncome - gstExpense

	profit := totalIncome - totalExpense

	// Monthly Breakdown for Profit/Loss
	var chartData []struct {
		Month   string  `json:"month"`
		Income  float64 `json:"income"`
		Expense float64 `json:"expense"`
	}

	// Complex query simplified: just return last 6 months placeholders or logic
	// For production, this should grouping by DATE_TRUNC or similar.

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

	uid := c.GetUint("userID")

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var balance models.CompanyBalance
		if err := tx.First(&balance).Error; err != nil {
			balance = models.CompanyBalance{TotalBalance: 0}
			if err := tx.Create(&balance).Error; err != nil {
				return err
			}
		}

		balance.TotalBalance += input.Amount
		balance.LastUpdatedBy = uid
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

// Utility function to be used by other handlers
func AdjustBalance(tx *gorm.DB, amount float64, logType, reference, notes string) error {
	var balance models.CompanyBalance
	if err := tx.First(&balance).Error; err != nil {
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
		Reference: reference,
		Notes:     notes,
	}
	return tx.Create(&log).Error
}
