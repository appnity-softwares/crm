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

type CreateLeadInput struct {
	Name       string     `json:"name" binding:"required"`
	Email      string     `json:"email" binding:"omitempty,email"`
	Phone      string     `json:"phone"`
	Company    string     `json:"company"`
	Source     string     `json:"source" binding:"omitempty,oneof=website referral social other"`
	Status     string     `json:"status" binding:"omitempty,oneof=new contacted qualified proposal won lost"`
	AssignedTo *uuid.UUID `json:"assigned_to"`
	Notes      string     `json:"notes"`
}

type UpdateLeadInput struct {
	Name       string     `json:"name"`
	Email      string     `json:"email" binding:"omitempty,email"`
	Phone      string     `json:"phone"`
	Company    string     `json:"company"`
	Source     string     `json:"source" binding:"omitempty,oneof=website referral social other"`
	Status     string     `json:"status" binding:"omitempty,oneof=new contacted qualified proposal won lost"`
	AssignedTo *uuid.UUID `json:"assigned_to"`
	Notes      string     `json:"notes"`
}

// CreateLead creates a new lead
func CreateLead(c *gin.Context) {
	var input CreateLeadInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	uID := userID.(uuid.UUID)

	lead := models.Lead{
		Name:       input.Name,
		Email:      input.Email,
		Phone:      input.Phone,
		Company:    input.Company,
		Source:     input.Source,
		Status:     input.Status,
		AssignedTo: input.AssignedTo,
		Notes:      input.Notes,
		AddedByID:  uID,
	}

	if lead.Source == "" {
		lead.Source = "other"
	}
	if lead.Status == "" {
		lead.Status = "new"
	}

	// Verify assigned user exists (if provided)
	if input.AssignedTo != nil {
		var user models.User
		if err := database.DB.First(&user, "id = ?", input.AssignedTo).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assigned user not found"})
			return
		}
	}

	if err := database.DB.Create(&lead).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create lead"})
		return
	}

	// Trigger notification for the assigned user
	if lead.AssignedTo != nil {
		CreateNotification(*lead.AssignedTo, "info", "New Lead Assigned", "You have been assigned a new lead: "+lead.Name)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Lead created successfully",
		"lead":    lead,
	})
}

// GetLeads returns all leads
func GetLeads(c *gin.Context) {
	var leads []models.Lead
	query := database.DB.Preload("Assignee").Preload("AddedBy")

	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role == "employee" {
		query = query.Where("assigned_to = ?", userID)
	}

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if source := c.Query("source"); source != "" {
		query = query.Where("source = ?", source)
	}
	if assignedTo := c.Query("assigned_to"); assignedTo != "" {
		query = query.Where("assigned_to = ?", assignedTo)
	}
	if company := c.Query("company"); company != "" {
		query = query.Where("company ILIKE ?", "%"+company+"%")
	}
	if addedBy := c.Query("added_by_id"); addedBy != "" {
		query = query.Where("added_by_id = ?", addedBy)
	}

	if err := query.Order("created_at DESC").Find(&leads).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leads"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(leads),
		"leads": leads,
	})
}

// GetLead returns a single lead
func GetLead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid lead ID"})
		return
	}

	var lead models.Lead
	if err := database.DB.Preload("Assignee").First(&lead, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"lead": lead})
}

// UpdateLead updates an existing lead
func UpdateLead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid lead ID"})
		return
	}

	var lead models.Lead
	if err := database.DB.First(&lead, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead not found"})
		return
	}

	var input UpdateLeadInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Email != "" {
		updates["email"] = input.Email
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.Company != "" {
		updates["company"] = input.Company
	}
	if input.Source != "" {
		updates["source"] = input.Source
	}
	if input.Status != "" {
		updates["status"] = input.Status
	}
	if input.AssignedTo != nil {
		// Verify assigned user exists
		var user models.User
		if err := database.DB.First(&user, "id = ?", input.AssignedTo).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assigned user not found"})
			return
		}
		updates["assigned_to"] = input.AssignedTo
	}
	if input.Notes != "" {
		updates["notes"] = input.Notes
	}

	database.DB.Model(&lead).Updates(updates)

	database.DB.Preload("Assignee").First(&lead, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message": "Lead updated successfully",
		"lead":    lead,
	})
}

// DeleteLead deletes a lead (admin only)
func DeleteLead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid lead ID"})
		return
	}

	var lead models.Lead
	if err := database.DB.First(&lead, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead not found"})
		return
	}

	database.DB.Delete(&lead)
	c.JSON(http.StatusOK, gin.H{"message": "Lead deleted successfully"})
}

// SubmitRequirement allows a prospect user to submit their project needs
func SubmitRequirement(c *gin.Context) {
	var input struct {
		Name    string `json:"name" binding:"required"`
		Company string `json:"company"`
		Notes   string `json:"notes" binding:"required"`
		Phone   string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	uID := userID.(uuid.UUID)

	var user models.User
	database.DB.First(&user, "id = ?", uID)

	lead := models.Lead{
		Name:      input.Name,
		Email:     user.Email,
		Phone:     input.Phone,
		Company:   input.Company,
		Source:    "website",
		Status:    "new",
		Notes:     input.Notes,
		UserID:    &uID,
		AddedByID: uID, // Self-added
	}

	if err := database.DB.Create(&lead).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit requirement"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Requirement submitted successfully! Our team will contact you soon.",
		"lead":    lead,
	})
}

// ConvertLeadToClient promotes a prospect user to client and creates a project
func ConvertLeadToClient(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))

	var lead models.Lead
	if err := database.DB.Preload("User").First(&lead, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead not found"})
		return
	}

	if lead.UserID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This lead is not associated with a registered user account"})
		return
	}

	var project models.Project
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update Lead Status
		if err := tx.Model(&models.Lead{}).Where("id = ?", lead.ID).Update("status", "won").Error; err != nil {
			return err
		}

		// 2. Promote User to Client
		if err := tx.Model(&models.User{}).Where("id = ?", *lead.UserID).Update("role", "client").Error; err != nil {
			return err
		}

		// 3. Create initial Project
		creatorID, _ := c.Get("user_id")
		project = models.Project{
			Name:        lead.Name + "'s Project",
			Description: lead.Notes,
			Status:      "planning",
			ClientID:    lead.UserID,
			CreatedBy:   creatorID.(uuid.UUID),
			StartDate:   time.Now(),
		}
		if err := tx.Create(&project).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert lead: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Lead converted to client successfully! Project created.",
		"project": project,
	})
}
