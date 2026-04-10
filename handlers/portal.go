package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
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

	// 1. Try Lookup by Invoice Token
	var invoice models.Invoice
	if err := database.DB.Preload("Project").First(&invoice, "secure_token = ?", token).Error; err == nil {
		// Found invoice, fetch its parent project data if available
		var project models.Project
		var invoices []models.Invoice
		var updates []models.ProjectUpdate
		var tasks []models.Task
		var resources []models.ProjectResource

		if invoice.ProjectID != nil {
			database.DB.Preload("Assignments.User").Preload("Creator").First(&project, "id = ?", invoice.ProjectID)
			database.DB.Where("project_id = ?", project.ID).Order("created_at DESC").Find(&invoices)
			database.DB.Preload("Comments.User").Preload("Author").Where("project_id = ?", project.ID).Order("created_at DESC").Find(&updates)
			database.DB.Where("project_id = ?", project.ID).Order("created_at ASC").Find(&tasks)
			database.DB.Where("project_id = ?", project.ID).Order("created_at DESC").Find(&resources)
		}

		c.JSON(http.StatusOK, gin.H{
			"type":      "invoice",
			"invoice":   invoice,
			"project":   project,
			"invoices":  invoices,
			"updates":   updates,
			"tasks":     tasks,
			"resources": resources,
		})
		return
	}

	// 2. Try Lookup by Project Portal Token
	var project models.Project
	if err := database.DB.Preload("Assignments.User").Preload("Creator").First(&project, "client_portal_token = ?", token).Error; err == nil {
		returnProjectPortalData(c, project)
		return
	}

	// 3. Fallback: Try Lookup by Project UUID (if token is a valid UUID)
	if _, uuidErr := uuid.Parse(token); uuidErr == nil {
		if err := database.DB.Preload("Assignments.User").Preload("Creator").First(&project, "id = ?", token).Error; err == nil {
			returnProjectPortalData(c, project)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Portal link is invalid or has expired"})
}

// Helper to return consistent project portal data
func returnProjectPortalData(c *gin.Context, project models.Project) {
	var invoices []models.Invoice
	database.DB.Where("project_id = ?", project.ID).Order("created_at DESC").Find(&invoices)

	var updates []models.ProjectUpdate
	database.DB.Preload("Comments.User").Preload("Author").Where("project_id = ?", project.ID).Order("created_at DESC").Find(&updates)

	var tasks []models.Task
	database.DB.Where("project_id = ?", project.ID).Order("created_at ASC").Find(&tasks)

	var resources []models.ProjectResource
	database.DB.Where("project_id = ?", project.ID).Order("created_at DESC").Find(&resources)

	c.JSON(http.StatusOK, gin.H{
		"type":      "project",
		"project":   project,
		"invoices":  invoices,
		"updates":   updates,
		"tasks":     tasks,
		"resources": resources,
	})
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

	var projectID uuid.UUID
	var clientID uuid.UUID

	// Verify token
	var invoice models.Invoice
	if err := database.DB.Select("project_id", "client_id").First(&invoice, "secure_token = ?", token).Error; err == nil && invoice.ProjectID != nil && invoice.ClientID != nil {
		projectID = *invoice.ProjectID
		clientID = *invoice.ClientID
	} else {
		var project models.Project
		if err := database.DB.Select("id", "client_id").First(&project, "client_portal_token = ?", token).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
			return
		}
		projectID = project.ID
		if project.ClientID != nil {
			clientID = *project.ClientID
		}
	}

	// Verify update belongs to project
	var update models.ProjectUpdate
	if err := database.DB.First(&update, "id = ? AND project_id = ?", input.UpdateID, projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Update not found"})
		return
	}

	// Support anonymous client access to portal comments
	comment := models.ProjectComment{
		UpdateID: input.UpdateID,
		Content:  input.Content,
	}

	if clientID != uuid.Nil {
		comment.UserID = clientID
	} else {
		// If project has no client assigned yet, associate with project creator as fallback/system
		var proj models.Project
		database.DB.First(&proj, "id = ?", projectID)
		comment.UserID = proj.CreatedBy
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post comment"})
		return
	}

	// Fetch project info for notification
	var project models.Project
	database.DB.First(&project, "id = ?", projectID)
	CreateNotification(project.CreatedBy, "message", "New Client Comment", "The client commented on '"+update.Title+"'")

	c.JSON(http.StatusCreated, gin.H{"message": "Comment posted successfully"})
}

// PortalCreateTicket allows clients to raise tickets from the portal
func PortalCreateTicket(c *gin.Context) {
	token := c.Param("token")
	var input struct {
		Subject     string `json:"subject" binding:"required"`
		Description string `json:"description" binding:"required"`
		Priority    string `json:"priority" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var projectID uuid.UUID

	// Verify token
	var invoice models.Invoice
	if err := database.DB.Select("project_id").First(&invoice, "secure_token = ?", token).Error; err == nil && invoice.ProjectID != nil {
		projectID = *invoice.ProjectID
	} else {
		var project models.Project
		if err := database.DB.Select("id").First(&project, "client_portal_token = ?", token).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
			return
		}
		projectID = project.ID
	}

	ticket := models.Ticket{
		ProjectID:   projectID,
		Subject:     input.Subject,
		Description: input.Description,
		Priority:    input.Priority,
		Status:      "open",
	}

	if err := database.DB.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket"})
		return
	}

	// Notify PM
	var project models.Project
	database.DB.First(&project, "id = ?", projectID)
	CreateNotification(project.CreatedBy, "message", "New Client Ticket", "Client raised a ticket: "+input.Subject)

	c.JSON(http.StatusCreated, ticket)
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
		"amount":   int(math.Round(invoice.Total * 100)), // mathematically safe rounding
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
		// Idempotency check
		if invoice.Status == "paid" {
			return nil
		}

		invoice.PaidAmount = invoice.Total
		invoice.Status = "paid"
		if err := tx.Save(&invoice).Error; err != nil {
			return err
		}

		// Adjust company balance safely
		refKey := "razorpay_" + input.RazorpayPaymentID
		err := SafeAdjustBalance(tx, invoice.Total, "income", refKey, "Razorpay Payment from Portal")
		if err != nil {
			return err
		}

		// Log activity for dashboard feed
		var clientID uuid.UUID
		if invoice.ClientID != nil {
			clientID = *invoice.ClientID
		}
		models.LogActivity(tx, clientID, "payment", "Payment Received", fmt.Sprintf("₹%v received for Invoice %s", invoice.Total, invoice.InvoiceNumber))
		return nil
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

	var projectID uuid.UUID

	// Verify token
	var invoice models.Invoice
	if err := database.DB.Select("project_id").First(&invoice, "secure_token = ?", token).Error; err == nil && invoice.ProjectID != nil {
		projectID = *invoice.ProjectID
	} else {
		var project models.Project
		if err := database.DB.Select("id").First(&project, "client_portal_token = ?", token).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
			return
		}
		projectID = project.ID
	}

	if err := database.DB.Model(&models.Project{}).Where("id = ?", projectID).Update("sow_accepted_by_client", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept SOW"})
		return
	}

	// Notify PM
	var project models.Project
	database.DB.First(&project, "id = ?", projectID)
	CreateNotification(project.CreatedBy, "message", "SOW Accepted", "The client accepted the SOW for '"+project.Name+"'")

	c.JSON(http.StatusOK, gin.H{"message": "SOW accepted successfully"})
}

// PortalRequestChat allows a client to request chat permission via portal token
func PortalRequestChat(c *gin.Context) {
	token := c.Param("token")
	var req struct {
		UserID uuid.UUID `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target user ID is required"})
		return
	}

	// Resolve Project and Client from token
	var project models.Project
	if err := database.DB.Select("id", "client_id", "created_by").First(&project, "client_portal_token = ?", token).Error; err != nil {
		// Try invoice token fallback
		var invoice models.Invoice
		if err := database.DB.Select("project_id", "client_id").First(&invoice, "secure_token = ?", token).Error; err == nil && invoice.ProjectID != nil {
			database.DB.Select("id", "client_id", "created_by").First(&project, "id = ?", invoice.ProjectID)
		} else {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
			return
		}
	}

	if project.ClientID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No client associated with this project"})
		return
	}

	// Create ChatPermission
	permission := models.ChatPermission{
		ClientID:  *project.ClientID,
		UserID:    req.UserID,
		ProjectID: project.ID,
		Status:    "requested",
	}

	if err := database.DB.Create(&permission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit request"})
		return
	}

	// Notify PM/Admin
	CreateNotification(project.CreatedBy, "message", "Chat Access Request", "The client requested chat access for project '"+project.Name+"'")

	c.JSON(http.StatusCreated, gin.H{"message": "Chat access request submitted to admin"})
}
