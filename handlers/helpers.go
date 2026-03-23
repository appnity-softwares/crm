package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// parseDate parses a date string in YYYY-MM-DD format
func parseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

// parsePagination extracts page and limit from query params with safe defaults
func parsePagination(c *gin.Context) (int, int) {
	page := 1
	limit := 50 // Default limit

	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
			if limit > 200 { // Max cap
				limit = 200
			}
		}
	}
	return page, limit
}
