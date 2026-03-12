package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"github.com/pushp314/erp-crm/utils"
)

func GetDashboardStats(c *gin.Context) {
	var empCount, projCount, leadCount, attCount int64
	role, _ := c.Get("user_role")
	perms, _ := c.Get("user_permissions")
	hasFinancePerm := utils.ContainsPermission(perms.(string), "finance") || role == "admin"

	database.DB.Model(&models.User{}).Count(&empCount)
	database.DB.Model(&models.Project{}).Count(&projCount)
	database.DB.Model(&models.Lead{}).Count(&leadCount)
	database.DB.Model(&models.Attendance{}).Count(&attCount)

	// Projects by status
	var projectStatus []struct {
		Status string
		Count  int
	}
	database.DB.Model(&models.Project{}).Select("status, count(*) as count").Group("status").Scan(&projectStatus)

	// Department breakdown - Restricted to admin/manager
	var deptBreakdown []struct {
		Department string
		Count      int
	}
	if role == "admin" || role == "manager" {
		database.DB.Model(&models.User{}).Select("department, count(*) as count").Group("department").Scan(&deptBreakdown)
	}

	// Recent activity (Last 5 leads)
	var recentLeads []models.Lead
	database.DB.Order("created_at desc").Limit(5).Find(&recentLeads)

	// Trend data (Last 6 months) - Strictly restricted
	var revenueStats []struct {
		Month string
		Total float64
	}
	if hasFinancePerm {
		database.DB.Model(&models.Invoice{}).
			Select("to_char(issued_at, 'Mon') as month, sum(total_amount) as total").
			Where("status = 'paid'").
			Group("month, extract(month from issued_at)").
			Order("extract(month from issued_at)").
			Scan(&revenueStats)
	}

	// Attendance trend (Last 7 days)
	var attTrend []struct {
		Date  string
		Count int
	}
	database.DB.Model(&models.Attendance{}).
		Select("to_char(date, 'DD Mon') as date, count(*) as count").
		Group("date, attendance.date").
		Order("attendance.date desc").
		Limit(7).
		Scan(&attTrend)

	// Reverse trend to be chronological
	for i, j := 0, len(attTrend)-1; i < j; i, j = i+1, j-1 {
		attTrend[i], attTrend[j] = attTrend[j], attTrend[i]
	}

	response := gin.H{
		"employees":        empCount,
		"projects":         projCount,
		"leads":            leadCount,
		"attendance":       attCount,
		"project_status":   projectStatus,
		"attendance_trend": attTrend,
	}

	if role == "admin" || role == "manager" {
		response["departments"] = deptBreakdown
		response["recent_leads"] = recentLeads
	}

	if hasFinancePerm {
		response["revenue_growth"] = revenueStats
	}

	c.JSON(http.StatusOK, response)
}
