package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"github.com/razorpay/razorpay-go"
	"gorm.io/gorm"
)

// GetPortalData fetches project and invoices for a secure token
func GetPortalData(c *gin.Context) {
	token := c.Param("token")

	// Check if token belongs to an invoice
	var invoice models.Invoice
	err := database.DB.Preload("Project").First(&invoice, "secure_token = ?", token).Error
	if err == nil {
		// Found invoice, return it and optionally its project
		c.JSON(http.StatusOK, gin.H{
			"type":    "invoice",
			"invoice": invoice,
		})
		return
	}

	// Check if token belongs to a project
	var project models.Project
	err = database.DB.First(&project, "client_portal_token = ?", token).Error
	if err == nil {
		// Found project, fetch its invoices, updates and comments
		var invoices []models.Invoice
		database.DB.Where("project_id = ?", project.ID).Find(&invoices)

		var updates []models.ProjectUpdate
		database.DB.Preload("Comments.User").Preload("Author").Where("project_id = ?", project.ID).Order("created_at DESC").Find(&updates)

		c.JSON(http.StatusOK, gin.H{
			"type":     "project",
			"project":  project,
			"invoices": invoices,
			"updates":  updates,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Portal link is invalid or expired"})
}

// PortalPostComment allows a client to comment on an update from the portal
func PortalPostComment(c *gin.Context) {
	token := c.Param("token")
	var input struct {
		UpdateID uuid.UUID `json:"update_id" binding:"required"`
		Content  string    `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify project belongs to token
	var project models.Project
	if err := database.DB.First(&project, "client_portal_token = ?", token).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
		return
	}

	// Verify update belongs to project
	var update models.ProjectUpdate
	if err := database.DB.First(&update, "id = ? AND project_id = ?", input.UpdateID, project.ID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Update not found"})
		return
	}

	comment := models.ProjectComment{
		UpdateID: input.UpdateID,
		UserID:   *project.ClientID,
		Content:  input.Content,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post comment"})
		return
	}

	// Trigger notification for the project manager or assigned employee
	// For simplicity, we can notify the creator of the project if no specific assignee is found
	CreateNotification(project.CreatedBy, "message", "New Client Comment", "The client commented on '"+update.Title+"'")

	c.JSON(http.StatusCreated, gin.H{"message": "Comment posted successfully"})
}

// InitializePayment creates a Razorpay Order
func InitializePayment(c *gin.Context) {
	token := c.Param("token")

	var invoice models.Invoice
	if err := database.DB.First(&invoice, "secure_token = ?", token).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	client := razorpay.NewClient(config.AppConfig.RazorpayKeyID, config.AppConfig.RazorpayKeySecret)

	data := map[string]any{
		"amount":   int(invoice.Total * 100), // in paise
		"currency": "INR",
		"receipt":  invoice.InvoiceNumber,
	}

	body, err := client.Order.Create(data, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Razorpay order"})
		return
	}

	orderID := body["id"].(string)
	invoice.RazorpayOrder = orderID
	database.DB.Save(&invoice)

	c.JSON(http.StatusOK, gin.H{
		"order_id": orderID,
		"amount":   invoice.Total * 100,
		"key":      config.AppConfig.RazorpayKeyID,
	})
}

// VerifyPayment verifies the Razorpay payment signature
func VerifyPayment(c *gin.Context) {
	var input struct {
		RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
		RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
		RazorpaySignature string `json:"razorpay_signature" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token := c.Param("token")
	var invoice models.Invoice
	if err := database.DB.First(&invoice, "secure_token = ?", token).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Verify signature
	secret := config.AppConfig.RazorpayKeySecret
	data := input.RazorpayOrderID + "|" + input.RazorpayPaymentID
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(data))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if input.RazorpaySignature != expectedSignature {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment signature"})
		return
	}

	// Update invoice as paid
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		invoice.PaidAmount = invoice.Total
		invoice.Status = "paid"
		if err := tx.Save(&invoice).Error; err != nil {
			return err
		}

		// Adjust company balance
		return AdjustBalance(tx, invoice.Total, "income", "Payment: "+invoice.InvoiceNumber, "Razorpay Payment from Portal")
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update payment status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment verified and recorded"})
}

// SendInvoiceReminder mocks sending an email reminder
func SendInvoiceReminder(c *gin.Context) {
	id := c.Param("id")
	var invoice models.Invoice
	if err := database.DB.First(&invoice, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Mocking email sending
	fmt.Printf("Sending reminder to %s for Invoice %s\n", invoice.ClientEmail, invoice.InvoiceNumber)

	c.JSON(http.StatusOK, gin.H{"message": "Reminder sent to " + invoice.ClientEmail})
}
// PortalAcceptSOW allows a client to accept the SOW from the portal
func PortalAcceptSOW(c *gin.Context) {
	token := c.Param("token")

	var project models.Project
	if err := database.DB.First(&project, "client_portal_token = ?", token).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
		return
	}

	if err := database.DB.Model(&project).Update("sow_accepted_by_client", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept SOW"})
		return
	}

	// Notify PM/Employee
	CreateNotification(project.CreatedBy, "message", "SOW Accepted", "The client accepted the SOW for '"+project.Name+"'")

	c.JSON(http.StatusOK, gin.H{"message": "SOW accepted successfully"})
}
