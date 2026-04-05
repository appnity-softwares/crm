package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

// GetAuditLogs returns a list of activities recorded in the system
func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	query := database.DB.Preload("User")

	// Optional filters
	if module := c.Query("module"); module != "" {
		query = query.Where("module = ?", module)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.Order("created_at DESC").Limit(100).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, logs)
}
