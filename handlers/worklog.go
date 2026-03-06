package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

type CreateWorkLogInput struct {
	ProjectID   *uuid.UUID `json:"project_id"`
	Date        string     `json:"date" binding:"required"`
	Hours       float64    `json:"hours" binding:"required,gt=0"`
	Description string     `json:"description" binding:"required"`
}

type UpdateWorkLogInput struct {
	ProjectID   *uuid.UUID `json:"project_id"`
	Date        string     `json:"date"`
	Hours       float64    `json:"hours" binding:"omitempty,gt=0"`
	Description string     `json:"description"`
}

// CreateWorkLog creates a new work log entry
func CreateWorkLog(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input CreateWorkLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := parseDate(input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	workLog := models.WorkLog{
		UserID:      uid,
		ProjectID:   input.ProjectID,
		Date:        date,
		Hours:       input.Hours,
		Description: input.Description,
	}

	if err := database.DB.Create(&workLog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create work log"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Work log created successfully",
		"work_log": workLog,
	})
}

// GetAllWorkLogs returns all work logs (admin/manager)
func GetAllWorkLogs(c *gin.Context) {
	var logs []models.WorkLog
	query := database.DB.Preload("User").Preload("Project")

	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if projectID := c.Query("project_id"); projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}
	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}

	if err := query.Order("date DESC").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch work logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":     len(logs),
		"work_logs": logs,
	})
}

// GetMyWorkLogs returns the authenticated user's work logs
func GetMyWorkLogs(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var logs []models.WorkLog
	query := database.DB.Where("user_id = ?", userID).Preload("Project")

	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}

	if err := query.Order("date DESC").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch work logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":     len(logs),
		"work_logs": logs,
	})
}

// UpdateWorkLog updates an existing work log (owner only)
func UpdateWorkLog(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	userRole, _ := c.Get("user_role")

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid work log ID"})
		return
	}

	var workLog models.WorkLog
	if err := database.DB.First(&workLog, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work log not found"})
		return
	}

	// Only owner or admin can update
	if workLog.UserID != uid && userRole.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own work logs"})
		return
	}

	var input UpdateWorkLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.ProjectID != nil {
		updates["project_id"] = input.ProjectID
	}
	if input.Date != "" {
		date, err := parseDate(input.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}
		updates["date"] = date
	}
	if input.Hours > 0 {
		updates["hours"] = input.Hours
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}

	database.DB.Model(&workLog).Updates(updates)

	database.DB.Preload("Project").First(&workLog, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message":  "Work log updated successfully",
		"work_log": workLog,
	})
}

// DeleteWorkLog deletes a work log (admin only)
func DeleteWorkLog(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid work log ID"})
		return
	}

	var workLog models.WorkLog
	if err := database.DB.First(&workLog, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work log not found"})
		return
	}

	database.DB.Delete(&workLog)
	c.JSON(http.StatusOK, gin.H{"message": "Work log deleted successfully"})
}
