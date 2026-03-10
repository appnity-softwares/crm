package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

type CreateEmployeeInput struct {
	Name        string `json:"name" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	Role        string `json:"role" binding:"required,oneof=admin manager employee"`
	Department  string `json:"department"`
	Designation string `json:"designation"`
	Phone       string `json:"phone"`
}

type UpdateEmployeeInput struct {
	Name        string `json:"name"`
	Role        string `json:"role" binding:"omitempty,oneof=admin manager employee"`
	Department  string `json:"department"`
	Designation string `json:"designation"`
	Phone       string `json:"phone"`
	Permissions string `json:"permissions"`
	Avatar      string `json:"avatar"`
	IsActive    *bool  `json:"is_active"`
}

// CreateEmployee creates a new employee (admin only)
func CreateEmployee(c *gin.Context) {
	var input CreateEmployeeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email already exists
	var existing models.User
	if err := database.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	user := models.User{
		Name:        input.Name,
		Email:       input.Email,
		Role:        input.Role,
		Department:  input.Department,
		Designation: input.Designation,
		Phone:       input.Phone,
		IsActive:    true,
	}

	if err := user.HashPassword(input.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create employee"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Employee created successfully",
		"employee": user,
	})
}

// GetEmployees returns a list of all employees
func GetEmployees(c *gin.Context) {
	var users []models.User
	query := database.DB

	// Filter by role
	if role := c.Query("role"); role != "" {
		query = query.Where("role = ?", role)
	}

	// Filter by department
	if dept := c.Query("department"); dept != "" {
		query = query.Where("department = ?", dept)
	}

	// Filter by active status
	if active := c.Query("is_active"); active != "" {
		query = query.Where("is_active = ?", active == "true")
	}

	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":     len(users),
		"employees": users,
	})
}

// GetEmployee returns a single employee by ID
func GetEmployee(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"employee": user})
}

// UpdateEmployee updates an employee (admin only)
func UpdateEmployee(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	var input UpdateEmployeeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Role != "" {
		updates["role"] = input.Role
	}
	if input.Department != "" {
		updates["department"] = input.Department
	}
	if input.Designation != "" {
		updates["designation"] = input.Designation
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.Permissions != "" {
		updates["permissions"] = input.Permissions
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if input.Avatar != "" {
		updates["avatar"] = input.Avatar
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update employee"})
		return
	}

	database.DB.First(&user, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{
		"message":  "Employee updated successfully",
		"employee": user,
	})
}

// DeleteEmployee soft-deactivates an employee (admin only)
func DeleteEmployee(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	// Soft deactivate rather than delete
	database.DB.Model(&user).Update("is_active", false)

	c.JSON(http.StatusOK, gin.H{"message": "Employee deactivated successfully"})
}

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input struct {
		Name   string `json:"name"`
		Phone  string `json:"phone"`
		Avatar string `json:"avatar"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.Avatar != "" {
		updates["avatar"] = input.Avatar
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	database.DB.First(&user, "id = ?", uid)
	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully", "user": user})
}

// GetEmployeeStats returns comprehensive statistics for an employee
func GetEmployeeStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	// Fetch Attendance
	var attendance []models.Attendance
	database.DB.Where("user_id = ?", id).Order("date DESC").Limit(30).Find(&attendance)

	// Fetch Work Logs
	var workLogs []models.WorkLog
	database.DB.Preload("Project").Where("user_id = ?", id).Order("date DESC").Limit(30).Find(&workLogs)

	// Fetch Projects
	var projects []models.Project
	database.DB.Joins("JOIN project_assignments ON project_assignments.project_id = projects.id").
		Where("project_assignments.user_id = ? AND project_assignments.deleted_at IS NULL", id).
		Find(&projects)

	// Fetch Daily KPI Reports
	var reports []models.DailyReport
	database.DB.Where("user_id = ?", id).Order("date DESC").Limit(30).Find(&reports)

	// Calculate some stats
	totalHours := 0.0
	for _, log := range workLogs {
		totalHours += log.Hours
	}

	presentDays := len(attendance) // simplified

	c.JSON(http.StatusOK, gin.H{
		"employee":   user,
		"attendance": attendance,
		"work_logs":  workLogs,
		"projects":   projects,
		"reports":    reports,
		"stats": gin.H{
			"total_hours":   totalHours,
			"present_days":  presentDays,
			"project_count": len(projects),
		},
	})
}
