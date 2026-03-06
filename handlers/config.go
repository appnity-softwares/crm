package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func GetFeatureFlags(c *gin.Context) {
	var flags []models.FeatureFlag
	if err := database.DB.Find(&flags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch flags"})
		return
	}
	c.JSON(http.StatusOK, flags)
}

func ToggleFeatureFlagEx(c *gin.Context) {
	key := c.Param("key")
	var flag models.FeatureFlag
	if err := database.DB.Where("key = ?", key).First(&flag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flag not found"})
		return
	}

	flag.Enabled = !flag.Enabled
	database.DB.Save(&flag)

	c.JSON(http.StatusOK, flag)
}
