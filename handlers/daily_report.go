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
	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}

	// Pagination
	page, limit := parsePagination(c)
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.DailyReport{}).Count(&total)

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   total,
		"page":    page,
		"limit":   limit,
		"reports": reports,
	})
}

func GetMyDailyReports(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var reports []models.DailyReport

	query := database.DB.Where("user_id = ?", userID)

	// Pagination
	page, limit := parsePagination(c)
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.DailyReport{}).Count(&total)

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   total,
		"page":    page,
		"limit":   limit,
		"reports": reports,
	})
}

func GetDailyReportStats(c *gin.Context) {
	var totalCount, submittedCount, approvedCount, rejectedCount int64

	database.DB.Model(&models.DailyReport{}).Count(&totalCount)
	database.DB.Model(&models.DailyReport{}).Where("status = ?", "submitted").Count(&submittedCount)
	database.DB.Model(&models.DailyReport{}).Where("status = ?", "approved").Count(&approvedCount)
	database.DB.Model(&models.DailyReport{}).Where("status = ?", "rejected").Count(&rejectedCount)

	// Per-user submission count for the current month
	type UserStat struct {
		UserID uuid.UUID `json:"user_id"`
		Name   string    `json:"name"`
		Count  int64     `json:"count"`
	}
	var userStats []UserStat
	database.DB.Table("daily_reports").
		Select("daily_reports.user_id, users.name, count(*) as count").
		Joins("join users on users.id = daily_reports.user_id").
		Where("daily_reports.deleted_at IS NULL").
		Group("daily_reports.user_id, users.name").
		Order("count desc").
		Limit(20).
		Scan(&userStats)

	c.JSON(http.StatusOK, gin.H{
		"total":     totalCount,
		"submitted": submittedCount,
		"approved":  approvedCount,
		"rejected":  rejectedCount,
		"by_user":   userStats,
	})
}

func ReviewDailyReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

	var req struct {
		Status      string `json:"status" binding:"required,oneof=approved rejected"`
		AdminRemark string `json:"admin_remark"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var report models.DailyReport
	if err := database.DB.First(&report, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	report.Status = req.Status
	report.AdminRemark = req.AdminRemark

	if err := database.DB.Save(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update report"})
		return
	}

	// Notify user
	CreateNotification(report.UserID, "info", "Daily Report Reviewed", "Your report for "+report.Date+" has been "+req.Status)

	c.JSON(http.StatusOK, gin.H{"message": "Report reviewed successfully", "report": report})
}

func UpdateDailyReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	role, _ := c.Get("user_role")

	var report models.DailyReport
	if err := database.DB.First(&report, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	// Security: Only owner or admin can update
	if report.UserID != uid && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to update this report"})
		return
	}

	var req struct {
		Date    string `json:"date"`
		Metrics string `json:"metrics"`
		Notes   string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Date != "" {
		report.Date = req.Date
	}
	if req.Metrics != "" {
		report.Metrics = req.Metrics
	}
	if req.Notes != "" {
		report.Notes = req.Notes
	}

	if err := database.DB.Save(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Daily report updated successfully", "report": report})
}

// DeleteDailyReport deletes a daily report (admin only)
func DeleteDailyReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

	var report models.DailyReport
	if err := database.DB.First(&report, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	if err := database.DB.Delete(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Report deleted successfully"})
}
