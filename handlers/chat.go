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

	var msg models.Message
	if err := c.ShouldBindJSON(&msg); err != nil {
		fmt.Printf("Chat Bind Error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg.SenderID = &sid

	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
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

	// This is a bit complex in GORM to get last message for each unique pair.
	// For simplicity, let's just return unique users I've chatted with or all users.
	var users []models.User
	database.DB.Where("id != ? AND is_active = ?", mid, true).Find(&users)

	// In a real app, we'd fetch unread counts etc.
	c.JSON(http.StatusOK, gin.H{"users": users})
}
