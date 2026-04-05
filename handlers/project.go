package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
	"gorm.io/gorm"
)

type CreateProjectInput struct {
	Name        string     `json:"name" binding:"required"`
	Description string     `json:"description"`
	Status      string     `json:"status" binding:"omitempty,oneof=planning active on_hold completed under_maintenance cancelled"`
	StartDate   string     `json:"start_date" binding:"required"`
	EndDate     string     `json:"end_date"`
	ClientID    *uuid.UUID `json:"client_id"`
	TotalValue  float64    `json:"total_value"`
	AmountPaid  float64    `json:"amount_paid"`
	Progress    int        `json:"progress"`
}

type UpdateProjectInput struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Status      string     `json:"status" binding:"omitempty,oneof=planning active on_hold completed under_maintenance cancelled"`
	StartDate   string     `json:"start_date"`
	EndDate     string     `json:"end_date"`
	Progress    *int       `json:"progress"`
	ClientID    *uuid.UUID `json:"client_id"`
	TotalValue  *float64   `json:"total_value"`
	AmountPaid  *float64   `json:"amount_paid"`
	SOW         string     `json:"sow"`
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
		ClientID:    input.ClientID,
		TotalValue:  input.TotalValue,
		AmountPaid:  input.AmountPaid,
		Progress:    input.Progress,
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

	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	switch userRole {
	case "client":
		query = query.Where("client_id = ?", userID)
	case "employee":
		// Employees see projects they are assigned to
		query = query.Joins("JOIN project_assignments ON project_assignments.project_id = projects.id").
			Where("project_assignments.user_id = ? AND project_assignments.removed_at IS NULL", userID)
	}

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

	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	// Admin and Manager can see everything
	if userRole != "admin" && userRole != "manager" {
		if userRole == "client" {
			if project.ClientID == nil || *project.ClientID != uid {
				c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this project"})
				return
			}
		} else {
			// Employee check
			isAssigned := false
			for _, a := range project.Assignments {
				if a.UserID == uid && a.RemovedAt == nil {
					isAssigned = true
					break
				}
			}
			if !isAssigned {
				c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to view this project"})
				return
			}
		}
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
	if err := database.DB.Preload("Assignments").First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)
	userRole, _ := c.Get("user_role")

	// Check if user is admin/manager OR an assigned employee
	isAssigned := false
	for _, a := range project.Assignments {
		if a.UserID == uid && a.RemovedAt == nil {
			isAssigned = true
			break
		}
	}

	if userRole != "admin" && userRole != "manager" && !isAssigned {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to update this project"})
		return
	}

	var input UpdateProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
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
	if input.Progress != nil {
		if userRole == "admin" || userRole == "manager" {
			updates["progress"] = *input.Progress
			updates["pending_progress"] = nil // Clear any pending
		} else {
			updates["pending_progress"] = *input.Progress
			// Don't update "progress" yet
		}
	}
	if input.ClientID != nil {
		updates["client_id"] = *input.ClientID
	}
	if input.TotalValue != nil {
		updates["total_value"] = *input.TotalValue
	}
	if input.SOW != "" {
		updates["sow"] = input.SOW
	}
	if input.AmountPaid != nil {
		updates["amount_paid"] = *input.AmountPaid
	}

	if err := database.DB.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}

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

// ApproveProjectUpdate approves a pending progress update
func ApproveProjectUpdate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var input struct {
		Action string `json:"action" binding:"required,oneof=approve reject"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var project models.Project
	if err := database.DB.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.PendingProgress == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No pending updates to approve"})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if input.Action == "approve" {
			oldProgress := project.Progress
			project.Progress = *project.PendingProgress

			// Automated Invoicing
			if oldProgress < 50 && project.Progress >= 50 && project.TotalValue > 0 {
				GenerateMilestoneInvoice(tx, project, 50)
			} else if oldProgress < 100 && project.Progress == 100 && project.TotalValue > 0 {
				GenerateMilestoneInvoice(tx, project, 100)
			}
		}
		project.PendingProgress = nil

		return tx.Save(&project).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project update " + input.Action + "d",
		"project": project,
	})
}

// CreateProjectUpdate adds a new link/update to a project
func CreateProjectUpdate(c *gin.Context) {
	userId, _ := c.Get("user_id")
	var input models.ProjectUpdate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.CreatedBy = userId.(uuid.UUID)
	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project update"})
		return
	}

	// Notify Client of project update
	var project models.Project
	if err := database.DB.First(&project, input.ProjectID).Error; err == nil && project.ClientID != nil {
		CreateNotification(*project.ClientID, "project_update", "New Project Update!", fmt.Sprintf("Progress has been posted for: %s", project.Name))
	}

	c.JSON(http.StatusCreated, input)
}

// GetProjectUpdates returns updates for a project
func GetProjectUpdates(c *gin.Context) {
	id := c.Param("id")
	var updates []models.ProjectUpdate
	if err := database.DB.Where("project_id = ?", id).Preload("Author").Preload("Comments.User").Order("created_at desc").Find(&updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project updates"})
		return
	}
	c.JSON(http.StatusOK, updates)
}

// CreateProjectComment adds a comment to an update
func CreateProjectComment(c *gin.Context) {
	userId, _ := c.Get("user_id")
	var input models.ProjectComment
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.UserID = userId.(uuid.UUID)
	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post comment"})
		return
	}

	database.DB.Preload("User").First(&input, "id = ?", input.ID)

	// Notify relevant parties
	var update models.ProjectUpdate
	if err := database.DB.Preload("Project").First(&update, input.UpdateID).Error; err == nil && update.Project.ClientID != nil {
		if input.UserID == *update.Project.ClientID {
			// Client commented -> notify Project Creator/Manager (use update.CreatedBy as a proxy for the 'owner')
			CreateNotification(update.CreatedBy, "message", "Client Commented on Project", fmt.Sprintf("%s: %s", input.User.Name, input.Content))
		} else {
			// Internal user commented -> notify Client
			CreateNotification(*update.Project.ClientID, "message", "New Update Comment", fmt.Sprintf("%s: %s", input.User.Name, input.Content))
		}
	}

	c.JSON(http.StatusCreated, input)
}

// GetProjectComments returns comments for a specific project update
func GetProjectComments(c *gin.Context) {
	updateID := c.Param("update_id")
	var comments []models.ProjectComment
	if err := database.DB.Where("update_id = ?", updateID).Preload("User").Order("created_at asc").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}
	c.JSON(http.StatusOK, comments)
}

// DeleteProject soft-deletes a project (admin only)
func DeleteProject(c *gin.Context) {
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

	// Check if project has active invoices
	var unpaidInvoices int64
	database.DB.Model(&models.Invoice{}).Where("project_id = ? AND status != ?", id, "paid").Count(&unpaidInvoices)
	if unpaidInvoices > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":           "Cannot delete project with unpaid invoices",
			"unpaid_invoices": unpaidInvoices,
		})
		return
	}

	if err := database.DB.Delete(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}
// SignProjectSOW signs the SOW for a project (client only)
func SignProjectSOW(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var project models.Project
	if err := database.DB.First(&project, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.ClientID == nil || *project.ClientID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the assigned client can sign the SOW"})
		return
	}

	now := time.Now()
	updates := map[string]any{
		"sow_signed_at": &now,
		"sow_signed_by": &uid,
	}

	if err := database.DB.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign SOW"})
		return
	}

	// Notify Admin
	CreateNotification(project.CreatedBy, "success", "SOW Signed!", fmt.Sprintf("Client has signed the SOW for project: %s", project.Name))

	c.JSON(http.StatusOK, gin.H{"message": "SOW signed successfully", "signed_at": now})
}
