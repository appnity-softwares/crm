package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

// Helper to check if user has access to a project
func hasProjectAccess(c *gin.Context, projectID uuid.UUID) bool {
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	if userRole == "admin" || userRole == "manager" {
		return true
	}

	var project models.Project
	if err := database.DB.Preload("Assignments").First(&project, "id = ?", projectID).Error; err != nil {
		return false
	}

	if userRole == "client" {
		return project.ClientID != nil && *project.ClientID == uid
	}

	if userRole == "employee" {
		for _, a := range project.Assignments {
			if a.UserID == uid && a.RemovedAt == nil {
				return true
			}
		}
	}

	return false
}

func CreateTask(c *gin.Context) {
	var task models.Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !hasProjectAccess(c, task.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this project"})
		return
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func GetProjectTasks(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	if !hasProjectAccess(c, projectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to project tasks"})
		return
	}

	var tasks []models.Task
	database.DB.Preload("Assignee").Where("project_id = ?", projectID).Order("created_at DESC").Find(&tasks)
	c.JSON(http.StatusOK, gin.H{"count": len(tasks), "tasks": tasks})
}

func UpdateTask(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var task models.Task
	if err := database.DB.First(&task, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if !hasProjectAccess(c, task.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update tasks for this project"})
		return
	}

	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&task)
	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	
	var task models.Task
	if err := database.DB.First(&task, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	userRole, _ := c.Get("user_role")
	if userRole != "admin" && userRole != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins or managers can delete tasks"})
		return
	}

	database.DB.Delete(&task)
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}
