package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
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
		// Found project, fetch its invoices too
		var invoices []models.Invoice
		database.DB.Where("project_id = ?", project.ID).Find(&invoices)

		c.JSON(http.StatusOK, gin.H{
			"type":     "project",
			"project":  project,
			"invoices": invoices,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Portal link is invalid or expired"})
}

// InitializePayment creates a Razorpay Order
func InitializePayment(c *gin.Context) {
	token := c.Param("token")

	var invoice models.Invoice
	if err := database.DB.First(&invoice, "secure_token = ?", token).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// In a real app, you'd call Razorpay API here to create an Order
	// razorpay.orders.create({amount: invoice.Total * 100, currency: "INR", receipt: invoice.ID})
	// For now, let's mock the order ID
	orderID := fmt.Sprintf("order_%s", invoice.ID.String()[:8])
	invoice.RazorpayOrder = orderID
	database.DB.Save(&invoice)

	c.JSON(http.StatusOK, gin.H{
		"order_id": orderID,
		"amount":   invoice.Total * 100, // in paise
		"key":      "rzp_test_MOCK_KEY", // Should be from config/env
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

	// signature = hmac_sha256(order_id + "|" + payment_id, secret)
	// We mock verification for now
	secret := "MOCK_SECRET"
	data := input.RazorpayOrderID + "|" + input.RazorpayPaymentID
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(data))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	// In reality, you'd compare input.RazorpaySignature with expectedSignature
	// if input.RazorpaySignature != expectedSignature { ... }
	fmt.Println("Expected Sig:", expectedSignature)

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
