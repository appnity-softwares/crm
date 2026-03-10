package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func CreateTask(c *gin.Context) {
	var task models.Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func GetProjectTasks(c *gin.Context) {
	projectID, _ := uuid.Parse(c.Param("id"))
	var tasks []models.Task
	database.DB.Preload("Assignee").Where("project_id = ?", projectID).Find(&tasks)
	c.JSON(http.StatusOK, gin.H{"tasks": tasks})
}

func UpdateTask(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var task models.Task
	if err := database.DB.First(&task, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
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
	database.DB.Delete(&models.Task{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted"})
}
