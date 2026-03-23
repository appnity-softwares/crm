package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	notif "github.com/pushp314/erp-crm/services/notification"
)

// ── FCM Token Management ────────────────────────────────────────

type SaveTokenInput struct {
	Token  string `json:"token" binding:"required"`
	Device string `json:"device" binding:"required,oneof=web android ios"`
}

// SaveFCMToken registers or updates a device token for push notifications.
func SaveFCMToken(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input SaveTokenInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Upsert: if token already exists for any user, update the user_id (device may have changed user)
	var existing models.FCMToken
	result := database.DB.Where("token = ?", input.Token).First(&existing)

	if result.Error == nil {
		// Token exists — update user and device
		database.DB.Model(&existing).Updates(map[string]any{
			"user_id": uid,
			"device":  input.Device,
		})
	} else {
		// New token
		token := models.FCMToken{
			UserID: uid,
			Token:  input.Token,
			Device: input.Device,
		}
		database.DB.Create(&token)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Device token registered"})
}

// RemoveFCMToken removes a device token (e.g., on logout).
func RemoveFCMToken(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Where("user_id = ? AND token = ?", uid, input.Token).Delete(&models.FCMToken{})
	c.JSON(http.StatusOK, gin.H{"message": "Device token removed"})
}

// ── Notification API Handlers ───────────────────────────────────

// GetNotifications returns notifications for the logged-in user
func GetNotifications(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var notifications []models.Notification
	if err := database.DB.Where("user_id = ?", uid).Order("created_at desc").Limit(50).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// MarkNotificationRead marks a single notification as read
func MarkNotificationRead(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	id := c.Param("id")

	if err := database.DB.Model(&models.Notification{}).Where("id = ? AND user_id = ?", id, uid).Update("read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// MarkAllNotificationsRead marks all notifications for a user as read
func MarkAllNotificationsRead(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	if err := database.DB.Model(&models.Notification{}).Where("user_id = ?", uid).Update("read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// DeleteNotification deletes a single notification
func DeleteNotification(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	id := c.Param("id")

	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).Delete(&models.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

// ── Notification Preferences ────────────────────────────────────

// GetNotificationTypes returns the available notification types for the UI
func GetNotificationTypes(c *gin.Context) {
	c.JSON(http.StatusOK, notif.AllNotificationTypes)
}

// GetPreferences returns current user's preferences
func GetPreferences(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	prefs := notif.Preferences.GetUserPreferences(uid)
	c.JSON(http.StatusOK, prefs)
}

// UpdatePreferences bulk updates user's preferences
func UpdatePreferences(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input struct {
		Updates []notif.PreferenceUpdate `json:"updates" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := notif.Preferences.BulkUpdate(uid, input.Updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preferences updated successfully"})
}

// ── Legacy Bridge ───────────────────────────────────────────────
// CreateNotification is kept for backward compatibility during migration.
// It now dispatches through the notification service layer.
func CreateNotification(userID uuid.UUID, notifType, title, message string) error {
	notif.Send(userID, notif.NotificationPayload{
		Title:   title,
		Message: message,
		Type:    notifType,
	})
	return nil
}
