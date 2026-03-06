package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/handlers"
	"github.com/pushp314/erp-crm/middleware"
)

func SetupRoutes(r *gin.Engine) {
	// ─── Public routes ───────────────────────────────────────────
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh", handlers.RefreshToken)
		}
	}

	// ─── Protected routes (require JWT) ──────────────────────────
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// Profile & Dashboard
		protected.GET("/profile", handlers.GetProfile)
		protected.GET("/dashboard/stats", handlers.GetDashboardStats)

		// ── Employees (admin-controlled) ──
		employees := protected.Group("/employees")
		{
			employees.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetEmployees)
			employees.GET("/:id", handlers.GetEmployee)
			employees.GET("/:id/stats", handlers.GetEmployeeStats)
			employees.POST("", middleware.RoleGuard("admin"), handlers.CreateEmployee)
			employees.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateEmployee)
			employees.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteEmployee)
		}

		// ── Attendance ──
		attendance := protected.Group("/attendance")
		{
			attendance.POST("/check-in", handlers.CheckIn)
			attendance.PUT("/check-out", handlers.CheckOut)
			attendance.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllAttendance)
			attendance.GET("/me", handlers.GetMyAttendance)
			attendance.GET("/qr-token", middleware.RoleGuard("admin"), handlers.GenerateQRToken)
			attendance.POST("/qr-checkin", handlers.QRCheckIn)
			attendance.POST("/manual", middleware.RoleGuard("admin"), handlers.ManualAttendance)
			attendance.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateAttendance)
			attendance.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteAttendance)
		}

		// ── Work Logs ──
		worklogs := protected.Group("/worklogs")
		{
			worklogs.POST("", handlers.CreateWorkLog)
			worklogs.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllWorkLogs)
			worklogs.GET("/me", handlers.GetMyWorkLogs)
			worklogs.PUT("/:id", handlers.UpdateWorkLog)
			worklogs.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteWorkLog)
		}

		// ── Daily Reports (Role based KPIs) ──
		reports := protected.Group("/reports")
		{
			reports.POST("", handlers.CreateDailyReport)
			reports.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllDailyReports)
			reports.GET("/me", handlers.GetMyDailyReports)
			reports.GET("/stats", middleware.RoleGuard("admin", "manager"), handlers.GetDailyReportStats)
		}

		// ── Projects ──
		projects := protected.Group("/projects")
		{
			projects.POST("", middleware.RoleGuard("admin", "manager"), handlers.CreateProject)
			projects.GET("", handlers.GetProjects)
			projects.GET("/:id", handlers.GetProject)
			projects.PUT("/:id", middleware.RoleGuard("admin", "manager"), handlers.UpdateProject)
			projects.POST("/:id/assign", middleware.RoleGuard("admin", "manager"), handlers.AssignMember)
			projects.POST("/:id/transfer", middleware.RoleGuard("admin", "manager"), handlers.TransferMember)
			projects.DELETE("/:id/members/:uid", middleware.RoleGuard("admin", "manager"), handlers.RemoveMember)
		}

		// ── Payroll ──
		payroll := protected.Group("/payroll")
		{
			payroll.POST("", middleware.RoleGuard("admin"), handlers.CreatePayroll)
			payroll.GET("", middleware.RoleGuard("admin"), handlers.GetAllPayroll)
			payroll.GET("/me", handlers.GetMyPayroll)
			payroll.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdatePayroll)
		}

		// ── Invoices ──
		invoices := protected.Group("/invoices")
		{
			invoices.POST("", middleware.RoleGuard("admin", "manager"), handlers.CreateInvoice)
			invoices.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetInvoices)
			invoices.GET("/:id", middleware.RoleGuard("admin", "manager"), handlers.GetInvoice)
			invoices.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateInvoice)
			invoices.PUT("/:id/status", middleware.RoleGuard("admin"), handlers.UpdateInvoiceStatus)
		}

		// ── Leads (CRM) ──
		leads := protected.Group("/leads")
		{
			leads.POST("", middleware.RoleGuard("admin", "manager"), handlers.CreateLead)
			leads.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetLeads)
			leads.GET("/:id", middleware.RoleGuard("admin", "manager"), handlers.GetLead)
			leads.PUT("/:id", middleware.RoleGuard("admin", "manager"), handlers.UpdateLead)
			leads.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteLead)
		}

		// ── Configs & Flags (admin) ──
		configs := protected.Group("/configs")
		{
			configs.GET("/flags", middleware.RoleGuard("admin"), handlers.GetFeatureFlags)
			configs.PATCH("/flags/:key", middleware.RoleGuard("admin"), handlers.ToggleFeatureFlagEx)
		}

		// ── Notifications ──
		notifications := protected.Group("/notifications")
		{
			notifications.GET("", handlers.GetNotifications)
			notifications.PUT("/:id/read", handlers.MarkNotificationRead)
			notifications.PUT("/read-all", handlers.MarkAllNotificationsRead)
			notifications.DELETE("/:id", handlers.DeleteNotification)
		}
	}
}
