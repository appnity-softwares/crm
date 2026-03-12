package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func CreateTicket(c *gin.Context) {
	var ticket models.Ticket
	if err := c.ShouldBindJSON(&ticket); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket"})
		return
	}

	c.JSON(http.StatusCreated, ticket)
}

func GetAllTickets(c *gin.Context) {
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var tickets []models.Ticket
	query := database.DB.Preload("Project").Order("created_at DESC")

	switch userRole {
	case "admin", "manager":
		// See all
	case "client":
		query = query.Joins("JOIN projects ON projects.id = tickets.project_id").
			Where("projects.client_id = ?", uid)
	case "employee":
		query = query.Joins("JOIN project_assignments ON project_assignments.project_id = tickets.project_id").
			Where("project_assignments.user_id = ? AND project_assignments.removed_at IS NULL", uid)
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := query.Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tickets"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}

func UpdateTicketStatus(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))

	var ticket models.Ticket
	if err := database.DB.First(&ticket, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	// Authorization check
	authorized := false
	if userRole == "admin" || userRole == "manager" {
		authorized = true
	} else if userRole == "client" {
		var project models.Project
		database.DB.First(&project, "id = ?", ticket.ProjectID)
		if project.ClientID != nil && *project.ClientID == uid {
			authorized = true
		}
	} else if userRole == "employee" {
		var assignment models.ProjectAssignment
		if err := database.DB.Where("project_id = ? AND user_id = ? AND removed_at IS NULL", ticket.ProjectID, uid).First(&assignment).Error; err == nil {
			authorized = true
		}
	}

	if !authorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this ticket"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required,oneof=open in_progress closed"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Model(&ticket).Update("status", input.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket updated"})
}

func GetProjectTickets(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token required"})
		return
	}

	// Verify token belongs to a project
	var project models.Project
	if err := database.DB.First(&project, "client_portal_token = ?", token).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid portal link"})
		return
	}

	var tickets []models.Ticket
	database.DB.Where("project_id = ?", project.ID).Order("created_at DESC").Find(&tickets)
	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}
