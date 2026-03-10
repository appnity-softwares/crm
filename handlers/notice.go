package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func CreateNotice(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var notice models.Notice
	if err := c.ShouldBindJSON(&notice); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	notice.CreatedBy = uid

	if err := database.DB.Create(&notice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notice"})
		return
	}

	// Create a global notification logic if needed
	// ...

	c.JSON(http.StatusCreated, notice)
}

func GetNotices(c *gin.Context) {
	var notices []models.Notice
	database.DB.Preload("Author").Order("created_at DESC").Limit(20).Find(&notices)
	c.JSON(http.StatusOK, gin.H{"notices": notices})
}

func DeleteNotice(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	if err := database.DB.Delete(&models.Notice{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notice"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Notice deleted"})
}
