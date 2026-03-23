package channels

import (
	"context"
	"log"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	notif "github.com/pushp314/erp-crm/services/notification"
	"google.golang.org/api/option"
)

// FCMChannel delivers push notifications via Firebase Cloud Messaging.
type FCMChannel struct {
	client *messaging.Client
	mu     sync.RWMutex
}

// NewFCMChannel initializes Firebase Admin SDK and returns an FCM channel.
// credentialsPath: path to firebase-adminsdk.json, or set GOOGLE_APPLICATION_CREDENTIALS env.
func NewFCMChannel() (*FCMChannel, error) {
	ctx := context.Background()

	var app *firebase.App
	var err error

	// Priority: FIREBASE_CREDENTIALS_JSON env → GOOGLE_APPLICATION_CREDENTIALS file → ./firebase-adminsdk.json
	credsJSON := os.Getenv("FIREBASE_CREDENTIALS_JSON")
	if credsJSON != "" {
		app, err = firebase.NewApp(ctx, nil, option.WithCredentialsJSON([]byte(credsJSON)))
	} else {
		// Falls back to GOOGLE_APPLICATION_CREDENTIALS env or default location
		credPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		if credPath == "" {
			credPath = "firebase-adminsdk.json"
		}

		if _, statErr := os.Stat(credPath); os.IsNotExist(statErr) {
			log.Println("⚠️  FCM: No Firebase credentials found, push notifications will be disabled")
			return &FCMChannel{client: nil}, nil
		}

		app, err = firebase.NewApp(ctx, nil, option.WithCredentialsFile(credPath))
	}

	if err != nil {
		return nil, err
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, err
	}

	log.Println("✅ FCM push notification channel initialized")
	return &FCMChannel{client: client}, nil
}

func (f *FCMChannel) Name() string {
	return "fcm"
}

func (f *FCMChannel) Send(userID uuid.UUID, payload notif.NotificationPayload) error {
	if f.client == nil {
		return nil // FCM not configured, silently skip
	}

	// Fetch all device tokens for this user
	tokens := f.getTokens(userID)
	if len(tokens) == 0 {
		return nil // User has no devices registered
	}

	ctx := context.Background()

	// Build FCM message data
	data := map[string]string{
		"type":  payload.Type,
		"title": payload.Title,
		"body":  payload.Message,
	}
	if payload.EntityID != nil {
		data["entity_id"] = payload.EntityID.String()
	}
	if payload.EntityType != "" {
		data["entity_type"] = payload.EntityType
	}

	// Send to all user devices via multicast
	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: payload.Title,
			Body:  payload.Message,
		},
		Data: data,
		Webpush: &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Title: payload.Title,
				Body:  payload.Message,
				Icon:  "/icon-192.png",
			},
		},
	}

	response, err := f.client.SendEachForMulticast(ctx, message)
	if err != nil {
		log.Printf("⚠️  FCM multicast error for user %s: %v", userID, err)
		return err
	}

	// Clean up invalid tokens
	if response.FailureCount > 0 {
		f.cleanupInvalidTokens(tokens, response)
	}

	return nil
}

func (f *FCMChannel) SendBulk(userIDs []uuid.UUID, payload notif.NotificationPayload) []error {
	errs := make([]error, len(userIDs))
	for i, uid := range userIDs {
		errs[i] = f.Send(uid, payload)
	}
	return errs
}

// getTokens fetches all registered FCM tokens for a user.
func (f *FCMChannel) getTokens(userID uuid.UUID) []string {
	var fcmTokens []models.FCMToken
	database.DB.Where("user_id = ?", userID).Find(&fcmTokens)

	tokens := make([]string, 0, len(fcmTokens))
	for _, t := range fcmTokens {
		tokens = append(tokens, t.Token)
	}
	return tokens
}

// cleanupInvalidTokens removes tokens that FCM reports as unregistered.
func (f *FCMChannel) cleanupInvalidTokens(tokens []string, response *messaging.BatchResponse) {
	for i, resp := range response.Responses {
		if resp.Error != nil {
			// Check if it's an unregistered/invalid token error
			if messaging.IsUnregistered(resp.Error) || messaging.IsInvalidArgument(resp.Error) {
				database.DB.Where("token = ?", tokens[i]).Delete(&models.FCMToken{})
				log.Printf("🗑️  Removed invalid FCM token: %s…", tokens[i][:20])
			}
		}
	}
}
