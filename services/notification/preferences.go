package notification

import (
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

// ── Notification Type Registry ──────────────────────────────────
// All notification types used across the system. Adding a new type here
// auto-seeds preferences for existing users on next startup.

type NotificationType struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

var AllNotificationTypes = []NotificationType{
	// Chat
	{Key: "chat_message", Label: "Chat Messages", Description: "New direct messages and replies", Category: "Chat"},
	{Key: "chat_permission", Label: "Chat Permission Requests", Description: "When someone requests permission to chat", Category: "Chat"},

	// Projects
	{Key: "project_assigned", Label: "Project Assignment", Description: "When you are assigned to a project", Category: "Projects"},
	{Key: "project_transfer", Label: "Project Transfer", Description: "When you are transferred between projects", Category: "Projects"},
	{Key: "project_update", Label: "Project Updates", Description: "New progress updates on your projects", Category: "Projects"},
	{Key: "project_comment", Label: "Project Comments", Description: "New comments on project updates", Category: "Projects"},

	// Finance
	{Key: "invoice_created", Label: "Invoice Created", Description: "When a new invoice is generated", Category: "Finance"},
	{Key: "payment_received", Label: "Payment Received", Description: "When a payment is confirmed", Category: "Finance"},
	{Key: "payroll_generated", Label: "Payroll Generated", Description: "When your payroll is created", Category: "Finance"},
	{Key: "payroll_paid", Label: "Payroll Paid", Description: "When your salary is credited", Category: "Finance"},

	// HR
	{Key: "leave_reviewed", Label: "Leave Request Updates", Description: "When your leave is approved or rejected", Category: "HR"},
	{Key: "lead_assigned", Label: "Lead Assigned", Description: "When a new lead is assigned to you", Category: "CRM"},
	{Key: "attendance_late", Label: "Late Attendance", Description: "Late check-in warnings", Category: "HR"},
	{Key: "daily_report_review", Label: "Daily Report Reviews", Description: "When your daily report is reviewed", Category: "HR"},

	// System
	{Key: "sow_accepted", Label: "SOW Accepted", Description: "When a client accepts a Statement of Work", Category: "System"},
	{Key: "system_alert", Label: "System Alerts", Description: "Important system notifications", Category: "System"},
}

// getTypeKeys returns a slice of just the type key strings.
func getTypeKeys() []string {
	keys := make([]string, len(AllNotificationTypes))
	for i, t := range AllNotificationTypes {
		keys[i] = t.Key
	}
	return keys
}

// ── Preference Cache ────────────────────────────────────────────

type cachedPrefs struct {
	prefs     map[string]*models.NotificationPreference // key = notif type
	fetchedAt time.Time
}

type PreferenceService struct {
	cache    map[uuid.UUID]*cachedPrefs
	mu       sync.RWMutex
	cacheTTL time.Duration
}

var Preferences *PreferenceService

func NewPreferenceService() *PreferenceService {
	ps := &PreferenceService{
		cache:    make(map[uuid.UUID]*cachedPrefs),
		cacheTTL: 5 * time.Minute,
	}
	Preferences = ps
	return ps
}

// SeedForUser creates default preferences for a user if they don't have them.
// Safe to call multiple times — uses ON CONFLICT DO NOTHING equivalent.
func (ps *PreferenceService) SeedForUser(userID uuid.UUID) {
	var existingCount int64
	database.DB.Model(&models.NotificationPreference{}).Where("user_id = ?", userID).Count(&existingCount)

	existingTypes := make(map[string]bool)
	if existingCount > 0 {
		var existing []models.NotificationPreference
		database.DB.Where("user_id = ?", userID).Find(&existing)
		for _, e := range existing {
			existingTypes[e.Type] = true
		}
	}

	for _, nt := range AllNotificationTypes {
		if existingTypes[nt.Key] {
			continue
		}
		pref := models.NotificationPreference{
			UserID: userID,
			Type:   nt.Key,
			InApp:  true,
			Push:   true,
			Email:  false,
		}
		database.DB.Create(&pref)
	}
}

// SeedAllUsers seeds preferences for all users who are missing any types.
func (ps *PreferenceService) SeedAllUsers() {
	var users []struct{ ID uuid.UUID }
	database.DB.Model(&models.User{}).Where("is_active = ?", true).Select("id").Find(&users)

	for _, u := range users {
		ps.SeedForUser(u.ID)
	}
	log.Printf("✅ Notification preferences seeded for %d active users", len(users))
}

// ShouldSend returns whether a notification should be delivered via the given channel.
// channel: "in_app", "fcm" (push), "email"
// Falls back to true (send) if no preference is found.
func (ps *PreferenceService) ShouldSend(userID uuid.UUID, notifType string, channel string) bool {
	pref := ps.getPref(userID, notifType)
	if pref == nil {
		return true // Default: send if no preference configured
	}

	switch channel {
	case "in_app":
		return pref.InApp
	case "fcm":
		return pref.Push
	case "email":
		return pref.Email
	default:
		return true
	}
}

// GetUserPreferences returns all preferences for a user (fetches from cache or DB).
func (ps *PreferenceService) GetUserPreferences(userID uuid.UUID) []models.NotificationPreference {
	ps.mu.RLock()
	cached, ok := ps.cache[userID]
	ps.mu.RUnlock()

	if ok && time.Since(cached.fetchedAt) < ps.cacheTTL {
		prefs := make([]models.NotificationPreference, 0, len(cached.prefs))
		for _, p := range cached.prefs {
			prefs = append(prefs, *p)
		}
		return prefs
	}

	// Cache miss — fetch from DB
	var prefs []models.NotificationPreference
	database.DB.Where("user_id = ?", userID).Find(&prefs)

	// Store in cache
	ps.cachePrefs(userID, prefs)

	return prefs
}

// UpdatePreference updates a single preference for a user.
func (ps *PreferenceService) UpdatePreference(userID uuid.UUID, notifType string, inApp, push, email bool) error {
	result := database.DB.Model(&models.NotificationPreference{}).
		Where("user_id = ? AND type = ?", userID, notifType).
		Updates(map[string]interface{}{
			"in_app": inApp,
			"push":   push,
			"email":  email,
		})

	if result.Error != nil {
		return result.Error
	}

	// Invalidate cache for this user
	ps.invalidateCache(userID)

	return nil
}

// BulkUpdate updates multiple preferences at once.
func (ps *PreferenceService) BulkUpdate(userID uuid.UUID, updates []PreferenceUpdate) error {
	tx := database.DB.Begin()

	for _, u := range updates {
		result := tx.Model(&models.NotificationPreference{}).
			Where("user_id = ? AND type = ?", userID, u.Type).
			Updates(map[string]interface{}{
				"in_app": u.InApp,
				"push":   u.Push,
				"email":  u.Email,
			})
		if result.Error != nil {
			tx.Rollback()
			return result.Error
		}
	}

	tx.Commit()
	ps.invalidateCache(userID)
	return nil
}

// ── Internal helpers ────────────────────────────────────────────

func (ps *PreferenceService) getPref(userID uuid.UUID, notifType string) *models.NotificationPreference {
	ps.mu.RLock()
	cached, ok := ps.cache[userID]
	ps.mu.RUnlock()

	if ok && time.Since(cached.fetchedAt) < ps.cacheTTL {
		if p, exists := cached.prefs[notifType]; exists {
			return p
		}
		return nil
	}

	// Cache miss — load all prefs for user
	ps.GetUserPreferences(userID)

	// Retry from cache
	ps.mu.RLock()
	cached, ok = ps.cache[userID]
	ps.mu.RUnlock()

	if ok {
		if p, exists := cached.prefs[notifType]; exists {
			return p
		}
	}
	return nil
}

func (ps *PreferenceService) cachePrefs(userID uuid.UUID, prefs []models.NotificationPreference) {
	prefMap := make(map[string]*models.NotificationPreference, len(prefs))
	for i := range prefs {
		prefMap[prefs[i].Type] = &prefs[i]
	}

	ps.mu.Lock()
	ps.cache[userID] = &cachedPrefs{
		prefs:     prefMap,
		fetchedAt: time.Now(),
	}
	ps.mu.Unlock()
}

func (ps *PreferenceService) invalidateCache(userID uuid.UUID) {
	ps.mu.Lock()
	delete(ps.cache, userID)
	ps.mu.Unlock()
}

// PreferenceUpdate is used for bulk update requests.
type PreferenceUpdate struct {
	Type  string `json:"type" binding:"required"`
	InApp bool   `json:"in_app"`
	Push  bool   `json:"push"`
	Email bool   `json:"email"`
}
