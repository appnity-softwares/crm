package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

// GetClients returns a list of all clients
func GetClients(c *gin.Context) {
	var users []models.User
	query := database.DB.Where("role = ?", "client")

	if active := c.Query("is_active"); active != "" {
		query = query.Where("is_active = ?", active == "true")
	}

	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch clients"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(users),
		"clients": users,
	})
}

// GetClient returns a single client by ID
func GetClient(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ? AND role = 'client'", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	// Fetch Related Data
	var projects []models.Project
	database.DB.Where("client_id = ?", id).Find(&projects)

	var invoices []models.Invoice
	database.DB.Where("client_id = ?", id).Order("created_at DESC").Find(&invoices)

	// Fetch Tickets across all client projects
	var projectIDs []uuid.UUID
	for _, p := range projects {
		projectIDs = append(projectIDs, p.ID)
	}
	var tickets []models.Ticket
	if len(projectIDs) > 0 {
		database.DB.Where("project_id IN (?)", projectIDs).Order("created_at DESC").Find(&tickets)
	}

	// Calculate Stats
	var totalPaid, totalPending float64
	for _, inv := range invoices {
		totalPaid += inv.PaidAmount
		totalPending += (inv.Total - inv.PaidAmount)
	}

	c.JSON(http.StatusOK, gin.H{
		"client":   user,
		"projects": projects,
		"invoices": invoices,
		"tickets":  tickets,
		"stats": gin.H{
			"total_paid":    totalPaid,
			"total_pending": totalPending,
			"project_count": len(projects),
			"ticket_count":  len(tickets),
		},
	})
}

// CreateClient creates a new client (admin only)
func CreateClient(c *gin.Context) {
	var input CreateEmployeeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Forcing role to client
	input.Role = "client"

	var existing models.User
	if err := database.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	user := models.User{
		Name:        input.Name,
		Email:       input.Email,
		Role:        "client",
		Phone:       input.Phone,
		IsActive:    true,
	}

	if err := user.HashPassword(input.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create client"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Client created successfully",
		"client":  user,
	})
}

// UpdateClient updates a client (admin only)
func UpdateClient(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ? AND role = 'client'", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	var input struct {
		Name     string `json:"name"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
		IsActive *bool  `json:"is_active"`
		Avatar   string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if input.Avatar != "" {
		updates["avatar"] = input.Avatar
	}
	if input.Password != "" {
		if err := user.HashPassword(input.Password); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		updates["password"] = user.Password
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update client"})
		return
	}

	database.DB.First(&user, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message": "Client updated successfully",
		"client":  user,
	})
}

// DeleteClient soft-deactivates a client (admin only)
func DeleteClient(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ? AND role = 'client'", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	database.DB.Model(&user).Update("is_active", false)
	c.JSON(http.StatusOK, gin.H{"message": "Client deactivated successfully"})
}
