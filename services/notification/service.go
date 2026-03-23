package notification

import (
	"log"
	"sync"

	"github.com/google/uuid"
)

// Service is the central orchestrator that dispatches notifications
// to all registered channels (in-app, FCM, email, etc.).
// It respects user preferences before dispatching to each channel.
type Service struct {
	channels []Channel
	mu       sync.RWMutex
}

// Global singleton — initialized once at startup.
var DefaultService *Service

// NewService creates a new notification service with the given channels.
func NewService(channels ...Channel) *Service {
	s := &Service{
		channels: channels,
	}
	DefaultService = s
	return s
}

// RegisterChannel adds a channel at runtime.
func (s *Service) RegisterChannel(ch Channel) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.channels = append(s.channels, ch)
	log.Printf("📡 Notification channel registered: %s", ch.Name())
}

// Notify sends a notification to a single user across registered channels,
// respecting user preferences for each channel.
func (s *Service) Notify(userID uuid.UUID, payload NotificationPayload) {
	s.mu.RLock()
	channels := make([]Channel, len(s.channels))
	copy(channels, s.channels)
	s.mu.RUnlock()

	for _, ch := range channels {
		// Check user preferences before sending
		if Preferences != nil && payload.Type != "" {
			if !Preferences.ShouldSend(userID, payload.Type, ch.Name()) {
				continue // User has disabled this channel for this notification type
			}
		}

		if err := ch.Send(userID, payload); err != nil {
			log.Printf("⚠️  Notification channel '%s' failed for user %s: %v", ch.Name(), userID, err)
		}
	}
}

// NotifyAsync sends a notification asynchronously (fire-and-forget).
func (s *Service) NotifyAsync(userID uuid.UUID, payload NotificationPayload) {
	go s.Notify(userID, payload)
}

// NotifyBulk sends the same notification to multiple users.
func (s *Service) NotifyBulk(userIDs []uuid.UUID, payload NotificationPayload) {
	for _, uid := range userIDs {
		s.NotifyAsync(uid, payload)
	}
}

// ── Package-level convenience functions ─────────────────────────

// Send is a package-level shortcut to DefaultService.Notify.
func Send(userID uuid.UUID, payload NotificationPayload) {
	if DefaultService == nil {
		log.Println("⚠️  Notification service not initialized, skipping notification")
		return
	}
	DefaultService.NotifyAsync(userID, payload)
}

// SendBulk is a package-level shortcut to DefaultService.NotifyBulk.
func SendBulk(userIDs []uuid.UUID, payload NotificationPayload) {
	if DefaultService == nil {
		log.Println("⚠️  Notification service not initialized, skipping notification")
		return
	}
	DefaultService.NotifyBulk(userIDs, payload)
}
