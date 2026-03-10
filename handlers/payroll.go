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

type CreatePayrollInput struct {
	UserID      uuid.UUID `json:"user_id" binding:"required"`
	Month       int       `json:"month" binding:"required,min=1,max=12"`
	Year        int       `json:"year" binding:"required,min=2020"`
	BasicSalary float64   `json:"basic_salary" binding:"required"`
	Bonus       float64   `json:"bonus"`
	Deductions  float64   `json:"deductions"`
}

type UpdatePayrollInput struct {
	BasicSalary *float64 `json:"basic_salary"`
	Bonus       *float64 `json:"bonus"`
	Deductions  *float64 `json:"deductions"`
	Status      string   `json:"status" binding:"omitempty,oneof=pending paid"`
}

// CreatePayroll creates a new payroll entry (admin only)
func CreatePayroll(c *gin.Context) {
	var input CreatePayrollInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user exists
	var user models.User
	if err := database.DB.First(&user, "id = ?", input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	// Check for duplicate payroll entry
	var existing models.Payroll
	if err := database.DB.Where("user_id = ? AND month = ? AND year = ?", input.UserID, input.Month, input.Year).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Payroll entry already exists for this month"})
		return
	}

	payroll := models.Payroll{
		UserID:      input.UserID,
		Month:       input.Month,
		Year:        input.Year,
		BasicSalary: input.BasicSalary,
		Bonus:       input.Bonus,
		Deductions:  input.Deductions,
		Status:      "pending",
	}
	payroll.CalculateNetSalary()

	if err := database.DB.Create(&payroll).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payroll entry"})
		return
	}

	// Notify employee
	CreateNotification(payroll.UserID, "info", "Payroll Generated", "Your payroll for "+time.Month(payroll.Month).String()+" "+time.Now().Format("2006")+" has been generated.")

	c.JSON(http.StatusCreated, gin.H{
		"message": "Payroll entry created successfully",
		"payroll": payroll,
	})
}

// GetAllPayroll returns all payroll records (admin only)
func GetAllPayroll(c *gin.Context) {
	var records []models.Payroll
	query := database.DB.Preload("User")

	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if month := c.Query("month"); month != "" {
		query = query.Where("month = ?", month)
	}
	if year := c.Query("year"); year != "" {
		query = query.Where("year = ?", year)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("year DESC, month DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payroll records"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(records),
		"payroll": records,
	})
}

// GetMyPayroll returns the authenticated user's payroll records
func GetMyPayroll(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var records []models.Payroll
	query := database.DB.Where("user_id = ?", userID)

	if year := c.Query("year"); year != "" {
		query = query.Where("year = ?", year)
	}

	if err := query.Order("year DESC, month DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payroll records"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(records),
		"payroll": records,
	})
}

// UpdatePayroll updates a payroll entry and optionally marks it as paid (admin only)
func UpdatePayroll(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payroll ID"})
		return
	}

	var payroll models.Payroll
	if err := database.DB.First(&payroll, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payroll entry not found"})
		return
	}

	var input UpdatePayrollInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.BasicSalary != nil {
		payroll.BasicSalary = *input.BasicSalary
	}
	if input.Bonus != nil {
		payroll.Bonus = *input.Bonus
	}
	if input.Deductions != nil {
		payroll.Deductions = *input.Deductions
	}
	payroll.CalculateNetSalary()

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if input.Status == "paid" && payroll.Status != "paid" {
			now := time.Now()
			payroll.PaidAt = &now
			payroll.Status = "paid"
		} else if input.Status != "" {
			payroll.Status = input.Status
		}

		if err := tx.Save(&payroll).Error; err != nil {
			return err
		}

		if payroll.Status == "paid" && input.Status == "paid" {
			// Extract user name for reference
			var emp models.User
			tx.First(&emp, "id = ?", payroll.UserID)
			return AdjustBalance(tx, -payroll.NetSalary, "expense", "Payroll: "+emp.Name, "Salary for "+time.Month(payroll.Month).String()+" "+time.Now().Format("2006"))
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update payroll and balance"})
		return
	}

	// Notify employee if paid
	if payroll.Status == "paid" {
		CreateNotification(payroll.UserID, "success", "Payroll Paid", "Your salary for "+time.Month(payroll.Month).String()+" has been credited.")
	}

	database.DB.Preload("User").First(&payroll, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message": "Payroll updated successfully",
		"payroll": payroll,
	})
}
