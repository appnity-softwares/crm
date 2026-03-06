package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

type CreateProjectInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Status      string `json:"status" binding:"omitempty,oneof=planning active on_hold completed"`
	StartDate   string `json:"start_date" binding:"required"`
	EndDate     string `json:"end_date"`
}

type UpdateProjectInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status" binding:"omitempty,oneof=planning active on_hold completed"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
}

type AssignMemberInput struct {
	UserID uuid.UUID `json:"user_id" binding:"required"`
	Role   string    `json:"role" binding:"omitempty,oneof=lead member"`
}

type TransferMemberInput struct {
	FromUserID uuid.UUID `json:"from_user_id" binding:"required"`
	ToUserID   uuid.UUID `json:"to_user_id" binding:"required"`
	Reason     string    `json:"reason"`
}

// CreateProject creates a new project
func CreateProject(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input CreateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := parseDate(input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
		return
	}

	project := models.Project{
		Name:        input.Name,
		Description: input.Description,
		Status:      input.Status,
		StartDate:   startDate,
		CreatedBy:   uid,
	}

	if project.Status == "" {
		project.Status = "planning"
	}

	if input.EndDate != "" {
		endDate, err := parseDate(input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format"})
			return
		}
		project.EndDate = &endDate
	}

	if err := database.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Project created successfully",
		"project": project,
	})
}

// GetProjects returns all projects
func GetProjects(c *gin.Context) {
	var projects []models.Project
	query := database.DB.Preload("Creator").Preload("Assignments").Preload("Assignments.User")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":    len(projects),
		"projects": projects,
	})
}

// GetProject returns a single project with details
func GetProject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var project models.Project
	if err := database.DB.
		Preload("Creator").
		Preload("Assignments").
		Preload("Assignments.User").
		Preload("Transfers").
		Preload("Transfers.FromUser").
		Preload("Transfers.ToUser").
		First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"project": project})
}

// UpdateProject updates an existing project
func UpdateProject(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var project models.Project
	if err := database.DB.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var input UpdateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.Status != "" {
		updates["status"] = input.Status
	}
	if input.StartDate != "" {
		startDate, err := parseDate(input.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format"})
			return
		}
		updates["start_date"] = startDate
	}
	if input.EndDate != "" {
		endDate, err := parseDate(input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format"})
			return
		}
		updates["end_date"] = endDate
	}

	database.DB.Model(&project).Updates(updates)

	database.DB.Preload("Creator").Preload("Assignments").Preload("Assignments.User").First(&project, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message": "Project updated successfully",
		"project": project,
	})
}

// AssignMember assigns a user to a project
func AssignMember(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// Verify project exists
	var project models.Project
	if err := database.DB.First(&project, "id = ?", projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var input AssignMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user exists
	var user models.User
	if err := database.DB.First(&user, "id = ?", input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already assigned (and not removed)
	var existing models.ProjectAssignment
	if err := database.DB.Where("project_id = ? AND user_id = ? AND removed_at IS NULL", projectID, input.UserID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already assigned to this project"})
		return
	}

	role := input.Role
	if role == "" {
		role = "member"
	}

	assignment := models.ProjectAssignment{
		ProjectID:  projectID,
		UserID:     input.UserID,
		Role:       role,
		AssignedAt: time.Now(),
	}

	if err := database.DB.Create(&assignment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign member"})
		return
	}

	database.DB.Preload("User").First(&assignment, "id = ?", assignment.ID)

	// Notify assigned user
	CreateNotification(input.UserID, "info", "New Project Assignment", "You have been assigned to project: "+project.Name)

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Member assigned successfully",
		"assignment": assignment,
	})
}

// TransferMember transfers a project assignment from one user to another
func TransferMember(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var input TransferMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify from_user is currently assigned
	var fromAssignment models.ProjectAssignment
	if err := database.DB.Where("project_id = ? AND user_id = ? AND removed_at IS NULL", projectID, input.FromUserID).First(&fromAssignment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source user is not assigned to this project"})
		return
	}

	// Verify to_user exists
	var toUser models.User
	if err := database.DB.First(&toUser, "id = ?", input.ToUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target user not found"})
		return
	}

	now := time.Now()

	// Remove from_user assignment
	fromAssignment.RemovedAt = &now
	database.DB.Save(&fromAssignment)

	// Create new assignment for to_user
	newAssignment := models.ProjectAssignment{
		ProjectID:  projectID,
		UserID:     input.ToUserID,
		Role:       fromAssignment.Role,
		AssignedAt: now,
	}
	database.DB.Create(&newAssignment)

	// Record the transfer
	transfer := models.ProjectTransfer{
		ProjectID:     projectID,
		FromUserID:    input.FromUserID,
		ToUserID:      input.ToUserID,
		Reason:        input.Reason,
		TransferredAt: now,
	}
	database.DB.Create(&transfer)

	database.DB.Preload("FromUser").Preload("ToUser").First(&transfer, "id = ?", transfer.ID)

	// Fetch project name for notification
	var p models.Project
	database.DB.First(&p, "id = ?", projectID)

	// Notify users
	CreateNotification(input.FromUserID, "warning", "Project Transfer", "You have been transferred out of project: "+p.Name)
	CreateNotification(input.ToUserID, "success", "Project Assignment", "You have been transferred into project: "+p.Name)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Member transferred successfully",
		"transfer": transfer,
	})
}

// RemoveMember removes a member from a project
func RemoveMember(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var assignment models.ProjectAssignment
	if err := database.DB.Where("project_id = ? AND user_id = ? AND removed_at IS NULL", projectID, userID).First(&assignment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	now := time.Now()
	assignment.RemovedAt = &now
	database.DB.Save(&assignment)

	c.JSON(http.StatusOK, gin.H{"message": "Member removed from project"})
}
