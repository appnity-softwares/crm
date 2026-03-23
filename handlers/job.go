package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

type CreateJobInput struct {
	Title       string `json:"title" binding:"required"`
	Company     string `json:"company" binding:"required"`
	Description string `json:"description"`
	Location    string `json:"location"`
	Salary      string `json:"salary"`
	Type        string `json:"type"`
	Deadline    string `json:"deadline"`
}

func CreateJob(c *gin.Context) {
	uID, _ := c.Get("user_id")
	var input CreateJobInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	job := models.Job{
		Title:       input.Title,
		Company:     input.Company,
		Description: input.Description,
		Location:    input.Location,
		Salary:      input.Salary,
		Type:        input.Type,
		PostedBy:    uID.(uuid.UUID),
	}

	if input.Deadline != "" {
		t, _ := time.Parse("2006-01-02", input.Deadline)
		job.Deadline = &t
	}

	if err := database.DB.Create(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post job"})
		return
	}

	c.JSON(http.StatusCreated, job)
}

func GetJobs(c *gin.Context) {
	var jobs []models.Job
	database.DB.Where("status = ?", "open").Order("created_at desc").Find(&jobs)
	c.JSON(http.StatusOK, jobs)
}

func DeleteJob(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	if err := database.DB.Delete(&models.Job{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete job"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Job deleted"})
}
