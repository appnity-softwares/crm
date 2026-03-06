package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

func main() {
	config.LoadConfig()
	database.Connect()

	fmt.Println("🌱 Seeding database with sample data...")

	// 1. Seed Users (Employees)
	roles := []string{"admin", "manager", "employee"}
	depts := []string{"Engineering", "Sales", "Marketing", "HR", "Operations"}
	desigs := []string{"Senior Developer", "BDR", "Content Lead", "Analyst", "Manager"}

	var users []models.User
	// Explicitly clear or check for existing users might be good,
	// but user wants to "see content" so let's just add.
	for i := 1; i <= 10; i++ {
		user := models.User{
			Name:        fmt.Sprintf("Employee %d", i),
			Email:       fmt.Sprintf("employee%d@erp.com", i),
			Role:        roles[rand.Intn(len(roles))],
			Department:  depts[rand.Intn(len(depts))],
			Designation: desigs[rand.Intn(len(desigs))],
			Phone:       fmt.Sprintf("987654321%d", i),
			IsActive:    true,
		}
		user.HashPassword("password123")
		if err := database.DB.Create(&user).Error; err != nil {
			log.Printf("Error creating user: %v", err)
		}
		users = append(users, user)
	}

	// 2. Seed Projects
	var projects []models.Project
	for i := 1; i <= 5; i++ {
		project := models.Project{
			Name:        fmt.Sprintf("Project %s", []string{"Alpha", "Beta", "Gamma", "Delta", "Omega"}[i-1]),
			Description: "High-priority enterprise project focused on digital transformation and automation.",
			Status:      []string{"planning", "active", "on_hold", "completed"}[rand.Intn(4)],
			StartDate:   time.Now().AddDate(0, -2, 0),
			CreatedBy:   users[0].ID,
		}
		if err := database.DB.Create(&project).Error; err != nil {
			log.Printf("Error creating project: %v", err)
		}
		projects = append(projects, project)
	}

	// 3. Project Assignments
	for _, p := range projects {
		for j := 0; j < 2; j++ {
			u := users[rand.Intn(len(users))]
			assignment := models.ProjectAssignment{
				ProjectID: p.ID,
				UserID:    u.ID,
				Role:      "member",
			}
			database.DB.Create(&assignment)
		}
	}

	// 4. Attendance & WorkLogs & DailyReports (Last 14 days)
	for _, u := range users {
		for i := 0; i < 14; i++ {
			date := time.Now().AddDate(0, 0, -i)
			if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
				continue
			}

			// Attendance
			checkIn := time.Date(date.Year(), date.Month(), date.Day(), 8+rand.Intn(2), rand.Intn(60), 0, 0, time.Local)
			checkOut := time.Date(date.Year(), date.Month(), date.Day(), 17+rand.Intn(2), rand.Intn(60), 0, 0, time.Local)
			attendance := models.Attendance{
				UserID:   u.ID,
				Date:     date,
				CheckIn:  checkIn,
				CheckOut: &checkOut,
				Status:   "present",
			}
			database.DB.Create(&attendance)

			// WorkLogs
			p := projects[rand.Intn(len(projects))]
			worklog := models.WorkLog{
				UserID:      u.ID,
				ProjectID:   &p.ID,
				Date:        date,
				Hours:       float64(6 + rand.Intn(4)),
				Description: "Contributed to core product architecture, finalized integration tests, and optimized database queries for performance.",
			}
			database.DB.Create(&worklog)

			// Daily Reports
			roleTypes := []string{"bdr", "content", "proposal", "general"}
			roleType := roleTypes[rand.Intn(len(roleTypes))]

			metrics := make(map[string]interface{})
			metrics["role_type"] = roleType
			if roleType == "bdr" {
				metrics["cold_emails"] = 40 + rand.Intn(20)
				metrics["linkedin_connects"] = 15 + rand.Intn(10)
				metrics["linkedin_dms"] = 5 + rand.Intn(10)
				metrics["leads_scraped"] = 40 + rand.Intn(30)
				metrics["crm_updated"] = true
			} else if roleType == "content" {
				metrics["linkedin_post"] = true
				metrics["case_studies"] = rand.Intn(3)
				metrics["website_improvements"] = "Optimized landing page load speed."
			}

			metricsJSON, _ := json.Marshal(metrics)
			report := models.DailyReport{
				UserID:  u.ID,
				Date:    date.Format("2006-01-02"),
				Metrics: string(metricsJSON),
				Notes:   "Productive work session, no major blockers encountered today.",
				Status:  "submitted",
			}
			database.DB.Create(&report)
		}
	}

	// 5. Leads
	for i := 1; i <= 20; i++ {
		lead := models.Lead{
			Name:       fmt.Sprintf("Lead Contact %d", i),
			Email:      fmt.Sprintf("contact%d@lead.com", i),
			Company:    fmt.Sprintf("Lead Company %d", i),
			Source:     []string{"website", "referral", "social", "other"}[rand.Intn(4)],
			Status:     []string{"new", "contacted", "qualified", "proposal", "won", "lost"}[rand.Intn(6)],
			AssignedTo: &users[rand.Intn(len(users))].ID,
			Notes:      "Interested in enterprise CRM solutions and service automation.",
		}
		database.DB.Create(&lead)
	}

	// 6. Invoices
	for i := 1; i <= 10; i++ {
		p := projects[rand.Intn(len(projects))]
		invoice := models.Invoice{
			ProjectID:  &p.ID,
			ClientName: fmt.Sprintf("Client of %s", p.Name),
			Amount:     float64(5000 + rand.Intn(10000)),
			Tax:        float64(500 + rand.Intn(1000)),
			Status:     []string{"draft", "sent", "paid", "overdue"}[rand.Intn(4)],
			DueDate:    time.Now().AddDate(0, 0, rand.Intn(30)),
			IssuedAt:   time.Now().AddDate(0, 0, -rand.Intn(10)),
		}
		database.DB.Create(&invoice)
	}

	fmt.Println("✨ Database seeded successfully!")
}
