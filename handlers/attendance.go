package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

var (
	qrTokens   = make(map[string]time.Time)
	qrTokensMu sync.Mutex
)

// parseFlexibleTime tries to parse a time string. If it's just HH:MM, it combines it with the provided date.
func parseFlexibleTime(timeStr string, baseDate time.Time) (time.Time, error) {
	// Try RFC3339 first
	if t, err := time.Parse(time.RFC3339, timeStr); err == nil {
		return t, nil
	}

	// Try HH:MM
	if t, err := time.Parse("15:04", timeStr); err == nil {
		return time.Date(baseDate.Year(), baseDate.Month(), baseDate.Day(), t.Hour(), t.Minute(), 0, 0, time.Local), nil
	}

	// Try HH:MM:SS
	if t, err := time.Parse("15:04:05", timeStr); err == nil {
		return time.Date(baseDate.Year(), baseDate.Month(), baseDate.Day(), t.Hour(), t.Minute(), t.Second(), 0, time.Local), nil
	}

	return time.Time{}, fmt.Errorf("invalid time format: %s", timeStr)
}

// GenerateQRToken generates a dynamic, time-limited token for attendance scanning
func GenerateQRToken(c *gin.Context) {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	token := hex.EncodeToString(bytes)

	// Admin can specify validity duration (default 15 seconds)
	// Example: ?duration=15
	durationStr := c.DefaultQuery("duration", "15")
	duration, err := time.ParseDuration(durationStr + "s")
	if err != nil {
		duration = 15 * time.Second
	}

	qrTokensMu.Lock()
	qrTokens[token] = time.Now().Add(duration)
	qrTokensMu.Unlock()

	// Cleanup expired tokens
	go func() {
		qrTokensMu.Lock()
		defer qrTokensMu.Unlock()
		now := time.Now()
		for k, v := range qrTokens {
			if v.Before(now) {
				delete(qrTokens, k)
			}
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_in": duration.Seconds(),
		"expires_at": time.Now().Add(duration),
	})
}

// QRCheckIn records clock-in securely using the scanned QR token
func QRCheckIn(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	qrTokensMu.Lock()
	expireAt, exists := qrTokens[req.Token]
	if exists && time.Now().Before(expireAt) {
		// Token is valid, but to prevent double-scanning the same token by multiple people quickly:
		// We could delete it, but usually a single token is valid for 15s for the whole office. Let's keep it.
	} else {
		qrTokensMu.Unlock()
		c.JSON(http.StatusForbidden, gin.H{"error": "QR Code expired or invalid. Please scan the latest code."})
		return
	}
	qrTokensMu.Unlock()

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	today := time.Now().Truncate(24 * time.Hour)

	var existing models.Attendance
	if err := database.DB.Where("user_id = ? AND date = ?", uid, today).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already checked in today"})
		return
	}

	now := time.Now()
	isLate := false
	if now.Hour() > 10 || (now.Hour() == 10 && now.Minute() >= 15) {
		isLate = true
	}

	attendance := models.Attendance{
		UserID:  uid,
		Date:    today,
		CheckIn: now,
		Status:  "present",
		IsLate:  isLate,
	}

	if err := database.DB.Create(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record check-in"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "QR Checked in successfully",
		"attendance": attendance,
	})
}

// CheckIn records clock-in for the authenticated user
func CheckIn(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	today := time.Now().Truncate(24 * time.Hour)

	// Check if already checked in today
	var existing models.Attendance
	if err := database.DB.Where("user_id = ? AND date = ?", uid, today).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already checked in today"})
		return
	}

	now := time.Now()
	isLate := false
	if now.Hour() > 10 || (now.Hour() == 10 && now.Minute() >= 15) {
		isLate = true
	}

	attendance := models.Attendance{
		UserID:  uid,
		Date:    today,
		CheckIn: now,
		Status:  "present",
		IsLate:  isLate,
	}

	if err := database.DB.Create(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record check-in"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Checked in successfully",
		"attendance": attendance,
	})
}

// CheckOut records clock-out for the authenticated user
func CheckOut(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	today := time.Now().Truncate(24 * time.Hour)

	var attendance models.Attendance
	if err := database.DB.Where("user_id = ? AND date = ?", uid, today).First(&attendance).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No check-in found for today"})
		return
	}

	if attendance.CheckOut != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already checked out today"})
		return
	}

	now := time.Now()
	attendance.CheckOut = &now
	database.DB.Save(&attendance)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Checked out successfully",
		"attendance": attendance,
	})
}

// GetAllAttendance returns attendance records (admin/manager)
func GetAllAttendance(c *gin.Context) {
	var records []models.Attendance
	query := database.DB.Preload("User")

	// Filter by user
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// Filter by date range
	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("date DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(records),
		"attendance": records,
	})
}

// GetMyAttendance returns the authenticated user's attendance
func GetMyAttendance(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var records []models.Attendance
	query := database.DB.Where("user_id = ?", userID)

	if from := c.Query("from"); from != "" {
		query = query.Where("date >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("date <= ?", to)
	}

	if err := query.Order("date DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(records),
		"attendance": records,
	})
}

// ManualAttendance records a manual entry by admin
func ManualAttendance(c *gin.Context) {
	var req struct {
		UserID   uuid.UUID `json:"user_id" binding:"required"`
		Date     string    `json:"date" binding:"required"`
		Status   string    `json:"status" binding:"required"`
		CheckIn  string    `json:"check_in"`
		CheckOut string    `json:"check_out"`
		Remark   string    `json:"remark"`
		IsLate   bool      `json:"is_late"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	attendance := models.Attendance{
		UserID: req.UserID,
		Date:   date,
		Status: req.Status,
		Remark: req.Remark,
		IsLate: req.IsLate,
	}

	if req.CheckIn != "" {
		if ci, err := parseFlexibleTime(req.CheckIn, date); err == nil {
			attendance.CheckIn = ci
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check_in format. Use HH:MM or RFC3339"})
			return
		}
	} else {
		// Default check-in to 9 AM of that date
		attendance.CheckIn = time.Date(date.Year(), date.Month(), date.Day(), 9, 0, 0, 0, time.Local)
	}

	if req.CheckOut != "" {
		if co, err := parseFlexibleTime(req.CheckOut, date); err == nil {
			attendance.CheckOut = &co
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check_out format. Use HH:MM or RFC3339"})
			return
		}
	}

	if err := database.DB.Create(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create record"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Attendance recorded", "attendance": attendance})
}

// UpdateAttendance modifies an existing record
func UpdateAttendance(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		UserID   uuid.UUID `json:"user_id"`
		Date     string    `json:"date"`
		Status   string    `json:"status"`
		CheckIn  string    `json:"check_in"`
		CheckOut string    `json:"check_out"`
		Remark   string    `json:"remark"`
		IsLate   *bool     `json:"is_late"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var attendance models.Attendance
	if err := database.DB.Where("id = ?", id).First(&attendance).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
		return
	}

	if req.UserID != uuid.Nil {
		attendance.UserID = req.UserID
	}
	if req.Date != "" {
		if date, err := time.Parse("2006-01-02", req.Date); err == nil {
			attendance.Date = date
		}
	}
	if req.Status != "" {
		attendance.Status = req.Status
	}
	if req.Remark != "" {
		attendance.Remark = req.Remark
	}
	if req.IsLate != nil {
		attendance.IsLate = *req.IsLate
	}
	if req.CheckIn != "" {
		if ci, err := parseFlexibleTime(req.CheckIn, attendance.Date); err == nil {
			attendance.CheckIn = ci
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check_in format. Use HH:MM or RFC3339"})
			return
		}
	}
	if req.CheckOut != "" {
		if co, err := parseFlexibleTime(req.CheckOut, attendance.Date); err == nil {
			attendance.CheckOut = &co
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid check_out format. Use HH:MM or RFC3339"})
			return
		}
	}

	if err := database.DB.Save(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance updated", "attendance": attendance})
}

// DeleteAttendance removes an attendance record
func DeleteAttendance(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Attendance{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Attendance deleted"})
}

// StartAutoCheckoutTask starts a background goroutine that auto check-outs employees at 5:30 PM (17:30)
func StartAutoCheckoutTask() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			now := time.Now()
			// Only run auto-checkout between 17:30 and 23:59
			if now.Hour() > 17 || (now.Hour() == 17 && now.Minute() >= 30) {
				var toCheckout []models.Attendance
				today := now.Truncate(24 * time.Hour)

				// Find active attendances for today (or earlier) that lack a check-out
				database.DB.Where("check_out IS NULL AND date <= ?", today).Find(&toCheckout)

				for _, att := range toCheckout {
					// Set checkout to 5:30 PM of the record's date
					co := time.Date(att.Date.Year(), att.Date.Month(), att.Date.Day(), 17, 30, 0, 0, time.Local)
					
					// Avoid setting checkout before checkin (edge case)
					if co.After(att.CheckIn) {
						att.CheckOut = &co
						att.Remark = "Auto check-out"
						database.DB.Save(&att)
					}
				}
			}
		}
	}()
}
