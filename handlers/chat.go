package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func SendMessage(c *gin.Context) {
	senderID, _ := c.Get("user_id")
	sid := senderID.(uuid.UUID)

	var req struct {
		ReceiverID uuid.UUID `json:"receiver_id" binding:"required"`
		Content    string    `json:"content" binding:"required"`
		Type       string    `json:"type" binding:"omitempty,oneof=text image link"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message format", "details": err.Error()})
		return
	}

	msgType := req.Type
	if msgType == "" {
		msgType = "text"
	}

	msg := models.Message{
		SenderID:   &sid,
		ReceiverID: req.ReceiverID,
		Content:    req.Content,
		Type:       msgType,
		Status:     "sent",
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Broadcast via socket
	if SocketServer != nil {
		receiverID := msg.ReceiverID.String()
		msgMap := map[string]any{
			"id":          msg.ID,
			"sender_id":   msg.SenderID,
			"receiver_id": msg.ReceiverID,
			"content":     msg.Content,
			"type":        msg.Type,
			"status":      msg.Status,
			"created_at":  msg.CreatedAt,
			"is_edited":   msg.IsEdited,
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
	database.DB.Where("((sender_id = ? AND receiver_id = ?) AND NOT hidden_for_sender) OR ((sender_id = ? AND receiver_id = ?) AND NOT hidden_for_receiver)", mid, otherID, otherID, mid).
		Order("created_at ASC").
		Find(&messages)

	// Mark as seen
	database.DB.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND status != 'seen'", otherID, mid).
		Update("status", "seen")

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func EditMessage(c *gin.Context) {
	userId, _ := c.Get("user_id")
	uid := userId.(uuid.UUID)
	msgId := c.Param("id")

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var msg models.Message
	if err := database.DB.First(&msg, "id = ?", msgId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	if msg.SenderID == nil || *msg.SenderID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to edit this message"})
		return
	}

	// Check 2 hour limit
	if time.Since(msg.CreatedAt) > 2*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Messages can only be edited within 2 hours of sending"})
		return
	}

	msg.Content = req.Content
	msg.IsEdited = true
	database.DB.Save(&msg)

	c.JSON(http.StatusOK, msg)
}

func DeleteMessage(c *gin.Context) {
	userId, _ := c.Get("user_id")
	uid := userId.(uuid.UUID)
	msgId := c.Param("id")

	var req struct {
		DeleteForEveryone bool `json:"delete_for_everyone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// If no body provided, default to delete for me? No, let's keep it safe.
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please specify if you want to delete for everyone or just for you"})
		return
	}

	var msg models.Message
	if err := database.DB.First(&msg, "id = ?", msgId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	if req.DeleteForEveryone {
		if msg.SenderID == nil || *msg.SenderID != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to delete this message for everyone"})
			return
		}
		// Actually delete from DB (soft delete via GORM)
		database.DB.Delete(&msg)
		c.JSON(http.StatusOK, gin.H{"message": "Message deleted for everyone"})
	} else {
		// Delete for me
		if msg.SenderID != nil && *msg.SenderID == uid {
			database.DB.Model(&msg).Update("hidden_for_sender", true)
		} else if msg.ReceiverID == uid {
			database.DB.Model(&msg).Update("hidden_for_receiver", true)
		} else {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized to delete this message"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Message hidden for you"})
	}
}

func GetConversations(c *gin.Context) {
	myID, _ := c.Get("user_id")
	mid := myID.(uuid.UUID)
	role, _ := c.Get("user_role")

	var users []models.User
	query := database.DB.Where("id != ? AND is_active = ?", mid, true)

	switch role {
	case "admin", "manager":
		query.Find(&users)
	case "employee":
		var clientIDs []uuid.UUID
		database.DB.Table("projects").
			Joins("join project_assignments on project_assignments.project_id = projects.id").
			Where("project_assignments.user_id = ? AND projects.client_id IS NOT NULL", mid).
			Pluck("projects.client_id", &clientIDs)

		var messagedIDs []uuid.UUID
		database.DB.Model(&models.Message{}).
			Where("sender_id = ? OR receiver_id = ?", mid, mid).
			Select("CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END", mid).
			Distinct().Pluck("id", &messagedIDs)

		query.Where("role IN ('admin', 'manager', 'employee') OR id IN (?) OR id IN (?)", clientIDs, messagedIDs).Find(&users)
	case "client":
		var approvedUserIDs []uuid.UUID
		database.DB.Model(&models.ChatPermission{}).
			Where("client_id = ? AND status = 'approved'", mid).
			Pluck("user_id", &approvedUserIDs)

		var messagedIDs []uuid.UUID
		database.DB.Model(&models.Message{}).
			Where("sender_id = ? OR receiver_id = ?", mid, mid).
			Select("CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END", mid).
			Distinct().Pluck("id", &messagedIDs)

		allowedIDs := append(approvedUserIDs, messagedIDs...)
		if len(allowedIDs) == 0 {
			c.JSON(http.StatusOK, gin.H{"users": []any{}})
			return
		}
		query.Where("id IN (?)", allowedIDs).Find(&users)
	default:
		c.JSON(http.StatusOK, gin.H{"users": []any{}})
		return
	}

	// ─── Fetch Unread Counts ───
	type UnreadResult struct {
		SenderID uuid.UUID
		Count    int64
	}
	var unreadResults []UnreadResult
	database.DB.Model(&models.Message{}).
		Where("receiver_id = ? AND status != 'seen'", mid).
		Select("sender_id, count(*) as count").
		Group("sender_id").
		Scan(&unreadResults)

	unreadMap := make(map[uuid.UUID]int64)
	for _, r := range unreadResults {
		unreadMap[r.SenderID] = r.Count
	}

	// ─── Fetch Last Message Timestamps ───
	type LastMsgResult struct {
		OtherID uuid.UUID
		LastAt  time.Time
	}
	var lastResults []LastMsgResult
	database.DB.Model(&models.Message{}).
		Where("sender_id = ? OR receiver_id = ?", mid, mid).
		Select("CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id, max(created_at) as last_at", mid).
		Group("other_id").
		Scan(&lastResults)

	lastMsgMap := make(map[uuid.UUID]time.Time)
	for _, r := range lastResults {
		lastMsgMap[r.OtherID] = r.LastAt
	}

	// ─── Assemble Response ───
	type UserConv struct {
		models.User
		UnreadCount   int64     `json:"unread_count"`
		LastMessageAt time.Time `json:"last_message_at"`
	}

	var conversations []UserConv
	for _, u := range users {
		conversations = append(conversations, UserConv{
			User:          u,
			UnreadCount:   unreadMap[u.ID],
			LastMessageAt: lastMsgMap[u.ID],
		})
	}

	c.JSON(http.StatusOK, gin.H{"users": conversations})
}

func GetChatPermissions(c *gin.Context) {
	userId, _ := c.Get("user_id")
	role, _ := c.Get("user_role")

	var permissions []models.ChatPermission
	query := database.DB.Preload("Client").Preload("User").Preload("Project")

	switch role {
	case "client":
		query = query.Where("client_id = ?", userId)
	case "employee":
		query = query.Where("user_id = ?", userId)
	}

	if err := query.Find(&permissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat permissions"})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

func RequestChatPermission(c *gin.Context) {
	var req struct {
		UserID    uuid.UUID `json:"user_id" binding:"required"`
		ProjectID uuid.UUID `json:"project_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clientID, _ := c.Get("user_id")
	cid := clientID.(uuid.UUID)

	permission := models.ChatPermission{
		ClientID:  cid,
		UserID:    req.UserID,
		ProjectID: req.ProjectID,
		Status:    "requested",
	}

	if err := database.DB.Create(&permission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to request chat permission"})
		return
	}

	c.JSON(http.StatusCreated, permission)
}

func UpdateChatPermission(c *gin.Context) {
	id := c.Param("id")
	var permission models.ChatPermission
	if err := database.DB.Where("id = ?", id).First(&permission).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permission record not found"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=approved rejected"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID, _ := c.Get("user_id")
	aid := adminID.(uuid.UUID)

	permission.Status = req.Status
	permission.ApprovedBy = &aid
	database.DB.Save(&permission)

	c.JSON(http.StatusOK, permission)
}
