package notification

import (
	"github.com/google/uuid"
)

// NotificationPayload represents the data for any notification.
type NotificationPayload struct {
	Title      string                 `json:"title"`
	Message    string                 `json:"message"`
	Type       string                 `json:"type"`        // info, success, warning, error, message, project_update
	EntityID   *uuid.UUID             `json:"entity_id"`   // optional: ID of the related entity
	EntityType string                 `json:"entity_type"` // optional: lead, project, invoice, leave, etc.
	Metadata   map[string]interface{} `json:"metadata"`    // optional: extra data for channels
}

// Channel is the interface every notification delivery mechanism must implement.
type Channel interface {
	// Name returns the channel identifier (e.g. "in_app", "fcm", "email").
	Name() string

	// Send delivers a notification to a single user.
	Send(userID uuid.UUID, payload NotificationPayload) error

	// SendBulk delivers a notification to multiple users.
	SendBulk(userIDs []uuid.UUID, payload NotificationPayload) []error
}
