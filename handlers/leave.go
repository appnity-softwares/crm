package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

type ApplyLeaveInput struct {
	LeaveType string `json:"leave_type" binding:"required,oneof=sick casual paid other"`
	StartDate string `json:"start_date" binding:"required"`
	EndDate   string `json:"end_date" binding:"required"`
	Reason    string `json:"reason" binding:"required"`
}

type ReviewLeaveInput struct {
	Status      string `json:"status" binding:"required,oneof=approved rejected"`
	AdminRemark string `json:"admin_remark"`
}

func ApplyLeave(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var input ApplyLeaveInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, _ := time.Parse("2006-01-02", input.StartDate)
	endDate, _ := time.Parse("2006-01-02", input.EndDate)

	leave := models.Leave{
		UserID:    uid,
		LeaveType: input.LeaveType,
		StartDate: startDate,
		EndDate:   endDate,
		Reason:    input.Reason,
		Status:    "pending",
	}

	if err := database.DB.Create(&leave).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply for leave"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Leave application submitted successfully", "leave": leave})
}

func GetMyLeaves(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid := userID.(uuid.UUID)

	var leaves []models.Leave
	database.DB.Where("user_id = ?", uid).Order("created_at DESC").Find(&leaves)

	c.JSON(http.StatusOK, gin.H{"leaves": leaves})
}

func GetAllLeaves(c *gin.Context) {
	var leaves []models.Leave
	query := database.DB.Preload("User").Order("created_at DESC")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Find(&leaves)
	c.JSON(http.StatusOK, gin.H{"leaves": leaves})
}

func ReviewLeave(c *gin.Context) {
	leaveID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave ID"})
		return
	}

	reviewerID, _ := c.Get("user_id")
	rid := reviewerID.(uuid.UUID)

	var input ReviewLeaveInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var leave models.Leave
	if err := database.DB.First(&leave, "id = ?", leaveID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	leave.Status = input.Status
	leave.AdminRemark = input.AdminRemark
	leave.ReviewedBy = &rid

	if err := database.DB.Save(&leave).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to review leave"})
		return
	}

	// Notify User
	CreateNotification(leave.UserID, "info", "Leave Request Update", "Your leave request has been "+input.Status)

	c.JSON(http.StatusOK, gin.H{"message": "Leave request " + input.Status, "leave": leave})
}
