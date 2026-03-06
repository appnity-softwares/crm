package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func CreateDailyReport(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var req struct {
		Date    string `json:"date" binding:"required"`
		Metrics string `json:"metrics" binding:"required"`
		Notes   string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request fields: " + err.Error()})
		return
	}

	report := models.DailyReport{
		UserID:  uid,
		Date:    req.Date,
		Metrics: req.Metrics,
		Notes:   req.Notes,
		Status:  "submitted",
	}

	if err := database.DB.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit daily report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Daily report submitted successfully", "report": report})
}

func GetAllDailyReports(c *gin.Context) {
	var reports []models.DailyReport
	query := database.DB.Preload("User")

	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if date := c.Query("date"); date != "" {
		query = query.Where("date = ?", date)
	}

	if err := query.Order("created_at DESC").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reports": reports})
}

func GetMyDailyReports(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var reports []models.DailyReport

	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reports": reports})
}

func GetDailyReportStats(c *gin.Context) {
	// Simple count for total submitted logic if required
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
