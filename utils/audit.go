package utils

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

// LogActivity records a management action to the AuditLog database
func LogActivity(c *gin.Context, module, action, targetID string, changes any) {
	userID, exists := c.Get("user_id")
	if !exists {
		return
	}
	uid := userID.(uuid.UUID)

	var changesStr string
	if changes != nil {
		if s, ok := changes.(string); ok {
			changesStr = s
		} else {
			cb, _ := json.Marshal(changes)
			changesStr = string(cb)
		}
	}

	log := models.AuditLog{
		UserID:    uid,
		Action:    action,
		Module:    module,
		TargetID:  targetID,
		Changes:   changesStr,
		IPAddress: c.ClientIP(),
	}

	database.DB.Create(&log)
}
