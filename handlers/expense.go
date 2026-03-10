package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"gorm.io/gorm"
)

type CreateExpenseInput struct {
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
	Amount      float64   `json:"amount" binding:"required"`
	Date        time.Time `json:"date" binding:"required"`
	Category    string    `json:"category"`
}

func CreateExpense(c *gin.Context) {
	var input CreateExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	expense := models.Expense{
		Title:       input.Title,
		Description: input.Description,
		Amount:      input.Amount,
		Date:        input.Date,
		Category:    input.Category,
		AddedBy:     userID.(uuid.UUID),
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&expense).Error; err != nil {
			return err
		}
		// Adjust Balance (Negative amount for expense)
		// Assuming AdjustBalance function is defined elsewhere and accessible
		return AdjustBalance(tx, -expense.Amount, "expense", expense.Title, expense.Description)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record expense and update balance"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Expense created", "expense": expense})
}

func GetAllExpenses(c *gin.Context) {
	var expenses []models.Expense
	query := database.DB.Preload("User")

	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Order("date DESC").Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"expenses": expenses})
}

func UpdateExpense(c *gin.Context) {
	id := c.Param("id")
	var expense models.Expense
	if err := database.DB.Where("id = ?", id).First(&expense).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	var input CreateExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	expense.Title = input.Title
	expense.Description = input.Description
	expense.Amount = input.Amount
	expense.Date = input.Date
	expense.Category = input.Category

	database.DB.Save(&expense)
	c.JSON(http.StatusOK, gin.H{"message": "Expense updated", "expense": expense})
}

func DeleteExpense(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Expense{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted"})
}
