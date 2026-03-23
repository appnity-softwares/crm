package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func GetFinanceAnalytics(c *gin.Context) {
	// Monthly Trend (Last 6 months)
	var trend []struct {
		Month   string  `json:"month"`
		Income  float64 `json:"income"`
		Expense float64 `json:"expense"`
	}

	// We'll calculate month ranges and query sums
	for i := 5; i >= 0; i-- {
		start := time.Now().AddDate(0, -i, -time.Now().Day()+1).Truncate(24 * time.Hour)
		end := start.AddDate(0, 1, -1)

		var incSum, expSum float64
		database.DB.Model(&models.Income{}).Where("date BETWEEN ? AND ?", start, end).Select("COALESCE(SUM(amount), 0)").Scan(&incSum)
		database.DB.Model(&models.Expense{}).Where("date BETWEEN ? AND ?", start, end).Select("COALESCE(SUM(amount), 0)").Scan(&expSum)

		trend = append(trend, struct {
			Month   string  `json:"month"`
			Income  float64 `json:"income"`
			Expense float64 `json:"expense"`
		}{
			Month:   start.Format("Jan"),
			Income:  incSum,
			Expense: expSum,
		})
	}

	// Category Breakdowns
	var incomeByCategory []struct {
		Category string  `json:"category"`
		Value    float64 `json:"value"`
	}
	database.DB.Model(&models.Income{}).Select("category, SUM(amount) as value").Group("category").Scan(&incomeByCategory)

	var expenseByCategory []struct {
		Category string  `json:"category"`
		Value    float64 `json:"value"`
	}
	database.DB.Model(&models.Expense{}).Select("category, SUM(amount) as value").Group("category").Scan(&expenseByCategory)

	// Project Profitability (Income by Project)
	var projectRevenue []struct {
		ProjectID   string  `json:"project_id"`
		ProjectName string  `json:"project_name"`
		Total       float64 `json:"total"`
	}
	database.DB.Table("incomes").
		Select("projects.name as project_name, SUM(incomes.amount) as total").
		Joins("join projects on projects.id = incomes.project_id").
		Group("projects.name").
		Scan(&projectRevenue)

	// Overall stats
	var totalIncome, totalExpense float64
	database.DB.Model(&models.Income{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)
	database.DB.Model(&models.Expense{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalExpense)

	c.JSON(http.StatusOK, gin.H{
		"trend":             trend,
		"income_categories": incomeByCategory,
		"expense_categories": expenseByCategory,
		"project_revenue":   projectRevenue,
		"summary": gin.H{
			"total_income":  totalIncome,
			"total_expense": totalExpense,
			"net_profit":    totalIncome - totalExpense,
			"margin":        0, // calculate later if needed
		},
	})
}
