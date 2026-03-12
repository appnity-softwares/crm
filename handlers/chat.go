package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func SendMessage(c *gin.Context) {
	senderID, _ := c.Get("user_id")
	sid := senderID.(uuid.UUID)

	// Use a clean request struct to avoid binding issues with nested User models
	var req struct {
		ReceiverID uuid.UUID `json:"receiver_id" binding:"required"`
		Content    string    `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("Chat Bind Error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message format", "details": err.Error()})
		return
	}

	msg := models.Message{
		SenderID:   &sid,
		ReceiverID: req.ReceiverID,
		Content:    req.Content,
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Broadcast via socket if available
	if SocketServer != nil {
		receiverID := msg.ReceiverID.String()
		msgMap := map[string]interface{}{
			"id":          msg.ID,
			"sender_id":   msg.SenderID,
			"receiver_id": msg.ReceiverID,
			"content":     msg.Content,
			"created_at":  msg.CreatedAt,
		}
		SocketServer.BroadcastToRoom("/", receiverID, "message", msgMap)
		SocketServer.BroadcastToRoom("/", msg.SenderID.String(), "message", msgMap)
	}

	c.JSON(http.StatusCreated, msg)
}

func GetChatHistory(c *gin.Context) {
	myID, _ := c.Get("user_id")
	mid := myID.(uuid.UUID)

	otherID, err := uuid.Parse(c.Param("otherID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var messages []models.Message
	database.DB.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)", mid, otherID, otherID, mid).
		Order("created_at ASC").
		Find(&messages)

	// Mark as read
	database.DB.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = ?", otherID, mid, false).
		Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func GetConversations(c *gin.Context) {
	myID, _ := c.Get("user_id")
	mid := myID.(uuid.UUID)
	role, _ := c.Get("user_role")

	var users []models.User
	query := database.DB.Where("id != ? AND is_active = ?", mid, true)

	switch role {
	case "admin", "manager":
		// Admins and Managers see everyone
		query.Find(&users)
	case "employee":
		// Employees see internal team + clients they are assigned to, or have messaged
		var clientIDs []uuid.UUID
		database.DB.Table("projects").
			Joins("join project_assignments on project_assignments.project_id = projects.id").
			Where("project_assignments.user_id = ? AND projects.client_id IS NOT NULL", mid).
			Pluck("projects.client_id", &clientIDs)

		// Also get IDs from message history
		var messagedIDs []uuid.UUID
		database.DB.Model(&models.Message{}).
			Where("sender_id = ? OR receiver_id = ?", mid, mid).
			Select("CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END", mid).
			Distinct().Pluck("id", &messagedIDs)

		query.Where("role IN ('admin', 'manager', 'employee') OR id IN (?) OR id IN (?)", clientIDs, messagedIDs).Find(&users)
	case "client":
		// Clients see ONLY those assigned to their projects OR those they have messaged
		var assignedUserIDs []uuid.UUID
		database.DB.Table("project_assignments").
			Joins("join projects on projects.id = project_assignments.project_id").
			Where("projects.client_id = ?", mid).
			Pluck("project_assignments.user_id", &assignedUserIDs)

		var messagedIDs []uuid.UUID
		database.DB.Model(&models.Message{}).
			Where("sender_id = ? OR receiver_id = ?", mid, mid).
			Select("CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END", mid).
			Distinct().Pluck("id", &messagedIDs)

		allowedIDs := append(assignedUserIDs, messagedIDs...)
		if len(allowedIDs) == 0 {
			c.JSON(http.StatusOK, gin.H{"users": []models.User{}})
			return
		}
		query.Where("id IN (?)", allowedIDs).Find(&users)
	default:
		// Prospects etc. see no one by default
		c.JSON(http.StatusOK, gin.H{"users": []models.User{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}
