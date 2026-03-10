package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"gorm.io/gorm"
)

type CreateInvoiceInput struct {
	ClientName  string     `json:"client_name" binding:"required"`
	ClientEmail string     `json:"client_email" binding:"omitempty,email"`
	ProjectID   *uuid.UUID `json:"project_id"`
	Amount      float64    `json:"amount" binding:"required"`
	Tax         float64    `json:"tax"`
	DueDate     string     `json:"due_date" binding:"required"`
}

type UpdateInvoiceInput struct {
	ClientName  string     `json:"client_name"`
	ClientEmail string     `json:"client_email" binding:"omitempty,email"`
	ProjectID   *uuid.UUID `json:"project_id"`
	Amount      *float64   `json:"amount"`
	Tax         *float64   `json:"tax"`
	DueDate     string     `json:"due_date"`
}

type UpdateInvoiceStatusInput struct {
	Status string `json:"status" binding:"required,oneof=draft sent paid overdue"`
}

// CreateInvoice creates a new invoice
func CreateInvoice(c *gin.Context) {
	var input CreateInvoiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dueDate, err := parseDate(input.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date format, use YYYY-MM-DD"})
		return
	}

	invoice := models.Invoice{
		ClientName:  input.ClientName,
		ClientEmail: input.ClientEmail,
		ProjectID:   input.ProjectID,
		Amount:      input.Amount,
		Tax:         input.Tax,
		DueDate:     dueDate,
		Status:      "draft",
	}

	if err := database.DB.Create(&invoice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Invoice created successfully",
		"invoice": invoice,
	})
}

// GetInvoices returns all invoices
func GetInvoices(c *gin.Context) {
	var invoices []models.Invoice
	query := database.DB.Preload("Project")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if clientName := c.Query("client_name"); clientName != "" {
		query = query.Where("client_name ILIKE ?", "%"+clientName+"%")
	}
	if projectID := c.Query("project_id"); projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}

	if err := query.Order("created_at DESC").Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoices"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":    len(invoices),
		"invoices": invoices,
	})
}

// GetInvoice returns a single invoice
func GetInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var invoice models.Invoice
	if err := database.DB.Preload("Project").First(&invoice, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invoice": invoice})
}

// UpdateInvoice updates an invoice
func UpdateInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var invoice models.Invoice
	if err := database.DB.First(&invoice, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	var input UpdateInvoiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.ClientName != "" {
		invoice.ClientName = input.ClientName
	}
	if input.ClientEmail != "" {
		invoice.ClientEmail = input.ClientEmail
	}
	if input.ProjectID != nil {
		invoice.ProjectID = input.ProjectID
	}
	if input.Amount != nil {
		invoice.Amount = *input.Amount
	}
	if input.Tax != nil {
		invoice.Tax = *input.Tax
	}
	if input.DueDate != "" {
		dueDate, err := parseDate(input.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date format"})
			return
		}
		invoice.DueDate = dueDate
	}
	invoice.CalculateTotal()

	database.DB.Save(&invoice)

	database.DB.Preload("Project").First(&invoice, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message": "Invoice updated successfully",
		"invoice": invoice,
	})
}

// UpdateInvoiceStatus changes the status of an invoice
func UpdateInvoiceStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var invoice models.Invoice
	if err := database.DB.First(&invoice, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	var input UpdateInvoiceStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&invoice).Update("status", input.Status).Error; err != nil {
			return err
		}

		if input.Status == "paid" {
			return AdjustBalance(tx, invoice.Total, "income", "Invoice: "+invoice.ID.String(), "Payment from "+invoice.ClientName)
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status and balance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Invoice status updated",
		"invoice": invoice,
	})
}
