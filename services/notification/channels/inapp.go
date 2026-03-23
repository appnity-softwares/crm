package channels

import (
	"log"

	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	notif "github.com/pushp314/erp-crm/services/notification"

	socketio "github.com/googollee/go-socket.io"
)

// InAppChannel saves notifications to the database and pushes
// real-time updates via Socket.io if available.
type InAppChannel struct {
	socketServer *socketio.Server
}

// NewInAppChannel creates a new in-app notification channel.
// socketServer can be nil if Socket.io is not available — notifications
// will still be persisted to the database.
func NewInAppChannel(socketServer *socketio.Server) *InAppChannel {
	return &InAppChannel{socketServer: socketServer}
}

func (c *InAppChannel) Name() string {
	return "in_app"
}

func (c *InAppChannel) Send(userID uuid.UUID, payload notif.NotificationPayload) error {
	// 1. Persist to database
	n := models.Notification{
		UserID:  userID,
		Type:    payload.Type,
		Title:   payload.Title,
		Message: payload.Message,
		Read:    false,
	}

	if err := database.DB.Create(&n).Error; err != nil {
		return err
	}

	// 2. Push real-time via Socket.io (if connected)
	if c.socketServer != nil {
		room := userID.String()
		c.socketServer.BroadcastToRoom("/", room, "notification", map[string]any{
			"id":         n.ID,
			"type":       n.Type,
			"title":      n.Title,
			"message":    n.Message,
			"read":       false,
			"created_at": n.CreatedAt,
		})
	}

	return nil
}

func (c *InAppChannel) SendBulk(userIDs []uuid.UUID, payload notif.NotificationPayload) []error {
	errs := make([]error, len(userIDs))
	for i, uid := range userIDs {
		if err := c.Send(uid, payload); err != nil {
			errs[i] = err
			log.Printf("⚠️  InApp notification failed for user %s: %v", uid, err)
		}
	}
	return errs
}
