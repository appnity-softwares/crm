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
	var tickets []models.Ticket
	database.DB.Preload("Project").Order("created_at DESC").Find(&tickets)
	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}

func UpdateTicketStatus(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var input struct {
		Status string `json:"status" binding:"required,oneof=open in_progress closed"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Model(&models.Ticket{}).Where("id = ?", id).Update("status", input.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket updated"})
}

func GetProjectTickets(c *gin.Context) {
	pid, _ := uuid.Parse(c.Param("projectID"))
	var tickets []models.Ticket
	database.DB.Where("project_id = ?", pid).Order("created_at DESC").Find(&tickets)
	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}
