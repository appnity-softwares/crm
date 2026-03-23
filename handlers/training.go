package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/models"
)

// ── Course Handlers ──

type CreateCourseInput struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Syllabus    string  `json:"syllabus"`
	Duration    int     `json:"duration"`
	TotalFee    float64 `json:"total_fee"`
}

func CreateCourse(c *gin.Context) {
	var input CreateCourseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	course := models.Course{
		Title:       input.Title,
		Description: input.Description,
		Syllabus:    input.Syllabus,
		Duration:    input.Duration,
		TotalFee:    input.TotalFee,
	}

	if err := database.DB.Create(&course).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create course"})
		return
	}

	c.JSON(http.StatusCreated, course)
}

func GetCourses(c *gin.Context) {
	var courses []models.Course
	database.DB.Find(&courses)
	c.JSON(http.StatusOK, courses)
}

type UpdateCourseInput struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Syllabus    string  `json:"syllabus"`
	Duration    int     `json:"duration"`
	TotalFee    float64 `json:"total_fee"`
	IsActive    *bool   `json:"is_active"`
}

func UpdateCourse(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var course models.Course
	if err := database.DB.First(&course, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	var input UpdateCourseInput
	c.ShouldBindJSON(&input)

	if input.Title != "" {
		course.Title = input.Title
	}
	if input.Description != "" {
		course.Description = input.Description
	}
	if input.Syllabus != "" {
		course.Syllabus = input.Syllabus
	}
	if input.Duration != 0 {
		course.Duration = input.Duration
	}
	if input.TotalFee != 0 {
		course.TotalFee = input.TotalFee
	}
	if input.IsActive != nil {
		course.IsActive = *input.IsActive
	}

	database.DB.Save(&course)
	c.JSON(http.StatusOK, course)
}

// ── Enrollment Handlers ──

type EnrollInput struct {
	StudentID uuid.UUID `json:"student_id" binding:"required"`
	CourseID  uuid.UUID `json:"course_id" binding:"required"`
	StartDate string    `json:"start_date" binding:"required"`
	TotalFee  float64   `json:"total_fee"`
}

func EnrollStudent(c *gin.Context) {
	var input EnrollInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, _ := time.Parse("2006-01-02", input.StartDate)

	enrollment := models.Enrollment{
		StudentID: input.StudentID,
		CourseID:  input.CourseID,
		StartDate: startDate,
		Status:    "active",
		TotalFee:  input.TotalFee,
	}

	if err := database.DB.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll student"})
		return
	}

	// Double check course exists to pull fee if not provided
	if enrollment.TotalFee == 0 {
		var course models.Course
		database.DB.First(&course, "id = ?", input.CourseID)
		enrollment.TotalFee = course.TotalFee
		database.DB.Save(&enrollment)
	}

	c.JSON(http.StatusCreated, enrollment)
}

func GetEnrollments(c *gin.Context) {
	var enrollments []models.Enrollment
	query := database.DB.Preload("Student").Preload("Course")

	if studentID := c.Query("student_id"); studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if courseID := c.Query("course_id"); courseID != "" {
		query = query.Where("course_id = ?", courseID)
	}

	query.Find(&enrollments)
	c.JSON(http.StatusOK, enrollments)
}

func GetMyEnrollments(c *gin.Context) {
	uID, _ := c.Get("user_id")
	var enrollments []models.Enrollment
	database.DB.Preload("Course").Where("student_id = ?", uID).Find(&enrollments)
	c.JSON(http.StatusOK, enrollments)
}

type UpdateEnrollmentInput struct {
	Status         string   `json:"status"`
	EndDate        string   `json:"end_date"`
	CompletedTopic string   `json:"completed_topic"`
	CertLink       string   `json:"cert_link"`
	OfferLink      string   `json:"offer_link"`
	PaidAmount     *float64 `json:"paid_amount"`
}

func UpdateEnrollment(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	var enrollment models.Enrollment
	if err := database.DB.First(&enrollment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Enrollment not found"})
		return
	}

	var input UpdateEnrollmentInput
	c.ShouldBindJSON(&input)

	if input.Status != "" {
		enrollment.Status = input.Status
		if input.Status == "completed" {
			// Switch trainee to alumni
			var user models.User
			if err := database.DB.First(&user, "id = ?", enrollment.StudentID).Error; err == nil {
				if user.Role == "trainee" {
					user.Role = "alumni"
					database.DB.Save(&user)
				}
			}
		}
	}
	if input.EndDate != "" {
		t, _ := time.Parse("2006-01-02", input.EndDate)
		enrollment.EndDate = &t
	}
	if input.CompletedTopic != "" {
		enrollment.CompletedTopic = input.CompletedTopic
	}
	if input.CertLink != "" {
		enrollment.CertLink = input.CertLink
	}
	if input.OfferLink != "" {
		enrollment.OfferLink = input.OfferLink
	}
	if input.PaidAmount != nil {
		enrollment.PaidAmount = *input.PaidAmount
	}

	database.DB.Save(&enrollment)
	c.JSON(http.StatusOK, enrollment)
}

type AddPaymentInput struct {
	Amount      float64 `json:"amount" binding:"required"`
	Description string  `json:"description"`
	Date        string  `json:"date" binding:"required"`
}

func AddEnrollmentPayment(c *gin.Context) {
	id, _ := uuid.Parse(c.Param("id"))
	uID, _ := c.Get("user_id")

	var enrollment models.Enrollment
	if err := database.DB.First(&enrollment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Enrollment not found"})
		return
	}

	var input AddPaymentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, _ := time.Parse("2006-01-02", input.Date)

	income := models.Income{
		Source:       "Training Fee",
		Amount:       input.Amount,
		Description:  input.Description,
		Category:     "Training",
		Date:         date,
		EnrollmentID: &enrollment.ID,
		CreatedBy:    uID.(uuid.UUID),
	}

	if err := database.DB.Create(&income).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record payment"})
		return
	}

	// Update enrollment paid amount
	enrollment.PaidAmount += input.Amount
	database.DB.Save(&enrollment)

	c.JSON(http.StatusCreated, income)
}
