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
)

// ── Input DTOs ──

type CreateIncomeInput struct {
	Source      string     `json:"source" binding:"required"`
	Amount      float64    `json:"amount" binding:"required,gt=0"`
	Description string     `json:"description"`
	Category    string     `json:"category"`
	Date        string     `json:"date" binding:"required"`
	ProjectID   *uuid.UUID `json:"project_id"`
}

type UpdateIncomeInput struct {
	Source      string     `json:"source"`
	Amount      *float64   `json:"amount" binding:"omitempty,gt=0"`
	Description string     `json:"description"`
	Category    string     `json:"category"`
	Date        string     `json:"date"`
	ProjectID   *uuid.UUID `json:"project_id"`
}

// CreateIncome creates a new income record and adjusts company balance
func CreateIncome(c *gin.Context) {
	var input CreateIncomeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := GetSafeUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	date, err := parseDate(input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	income := models.Income{
		Source:      input.Source,
		Amount:      input.Amount,
		Description: input.Description,
		Category:    input.Category,
		Date:        date,
		ProjectID:   input.ProjectID,
		CreatedBy:   userID,
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&income).Error; err != nil {
			return err
		}
		refKey := "income_" + income.ID.String()
		return SafeAdjustBalance(tx, income.Amount, "income", refKey, income.Source)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create income and update balance"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Income created", "income": income})
}

// GetAllIncome returns all income records with optional pagination
func GetAllIncome(c *gin.Context) {
	var income []models.Income
	query := database.DB.Preload("Project")

	// Filters
	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// Pagination
	page, limit := parsePagination(c)
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Income{}).Count(&total)

	if err := query.Order("date DESC").Offset(offset).Limit(limit).Find(&income).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch income"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":  total,
		"page":   page,
		"limit":  limit,
		"income": income,
	})
}

// UpdateIncome updates an existing income with partial fields
func UpdateIncome(c *gin.Context) {
	id := c.Param("id")
	var income models.Income
	if err := database.DB.Where("id = ?", id).First(&income).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Income record not found"})
		return
	}

	var input UpdateIncomeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
	if input.Source != "" {
		updates["source"] = input.Source
	}
	if input.Amount != nil {
		updates["amount"] = *input.Amount
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.Category != "" {
		updates["category"] = input.Category
	}
	if input.Date != "" {
		date, err := parseDate(input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
			return
		}
		updates["date"] = date
	}
	if input.ProjectID != nil {
		updates["project_id"] = input.ProjectID
	}
	updates["updated_at"] = time.Now()

	if err := database.DB.Model(&income).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update income"})
		return
	}

	utils.LogActivity(c, "income", "update", id, updates)

	database.DB.Preload("Project").First(&income, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Income updated", "income": income})
}

// DeleteIncome deletes an income record
func DeleteIncome(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Where("id = ?", id).Delete(&models.Income{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete income"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Income record deleted"})
}
