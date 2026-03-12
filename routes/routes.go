package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/handlers"
	"github.com/pushp314/erp-crm/middleware"
)

func SetupRoutes(r *gin.Engine, authLimiter *middleware.IPRateLimiter) {
	// ─── Public routes ───────────────────────────────────────────
	api := r.Group("/api")
	{
		public := api.Group("/auth")
		if authLimiter != nil {
			public.Use(middleware.RateLimitMiddleware(authLimiter))
		}
		{
			public.POST("/login", handlers.Login)
			public.POST("/register", handlers.Register)
			public.POST("/refresh", handlers.RefreshToken)
		}

		// ─── Portal (Public) ───
		portal := api.Group("/portal")
		{
			portal.GET("/:token", handlers.GetPortalData)
			portal.POST("/:token/pay", handlers.InitializePayment)
			portal.POST("/:token/verify", handlers.VerifyPayment)
			portal.POST("/:token/tickets", handlers.CreateTicket) // Publicly reachable via token logic in handler would be better, but for now direct is ok as it takes projectID
			portal.GET("/:token/tickets", handlers.GetProjectTickets)
		}
	}

	// ─── Protected routes (require JWT) ──────────────────────────
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// Profile & Dashboard
		protected.GET("/profile", handlers.GetProfile)
		protected.PUT("/profile", handlers.UpdateProfile)
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
			reports.PUT("/:id/review", middleware.RoleGuard("admin"), handlers.ReviewDailyReport)
		}

		// ── Projects ──
		projects := protected.Group("/projects")
		{
			projects.POST("", middleware.RoleGuard("admin", "manager"), handlers.CreateProject)
			projects.GET("", handlers.GetProjects)
			projects.GET("/:id", handlers.GetProject)
			projects.PUT("/:id", handlers.UpdateProject)
			projects.POST("/:id/assign", middleware.RoleGuard("admin", "manager"), handlers.AssignMember)
			projects.POST("/:id/transfer", middleware.RoleGuard("admin", "manager"), handlers.TransferMember)
			projects.PUT("/:id/approve", middleware.RoleGuard("admin", "manager"), handlers.ApproveProjectUpdate)
			projects.DELETE("/:id/members/:uid", middleware.RoleGuard("admin", "manager"), handlers.RemoveMember)

			// Tasks
			projects.GET("/:id/tasks", handlers.GetProjectTasks)
			projects.POST("/tasks", handlers.CreateTask)
			projects.PUT("/tasks/:id", handlers.UpdateTask)
			projects.DELETE("/tasks/:id", handlers.DeleteTask)
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
			invoices.POST("/:id/remind", middleware.RoleGuard("admin"), handlers.SendInvoiceReminder)
		}

		// ── Leads (CRM) ──
		leads := protected.Group("/leads")
		{
			// Admin/Manager tools
			leads.POST("", middleware.RoleGuard("admin", "manager"), handlers.CreateLead)
			leads.GET("", handlers.GetLeads)
			leads.GET("/:id", handlers.GetLead)
			leads.PUT("/:id", middleware.RoleGuard("admin", "manager"), handlers.UpdateLead)
			leads.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteLead)
			leads.POST("/:id/convert", middleware.RoleGuard("admin", "manager"), handlers.ConvertLeadToClient)

			// Prospect tools
			leads.POST("/requirement", middleware.RoleGuard("prospect"), handlers.SubmitRequirement)
		}

		// ── Expenses ──
		expenses := protected.Group("/expenses")
		{
			expenses.POST("", middleware.RoleGuard("admin"), handlers.CreateExpense)
			expenses.GET("", middleware.RoleGuard("admin"), handlers.GetAllExpenses)
			expenses.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateExpense)
			expenses.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteExpense)
		}

		// ── Configs & Flags (admin) ──
		configs := protected.Group("/configs")
		{
			configs.GET("/flags", middleware.RoleGuard("admin"), handlers.GetFeatureFlags)
			configs.PATCH("/flags/:key", middleware.RoleGuard("admin"), handlers.ToggleFeatureFlagEx)
		}

		// ── Finance (Balance) ──
		finance := protected.Group("/finance")
		{
			finance.GET("/balance", handlers.GetBalance)
			finance.GET("/stats", middleware.RoleGuard("admin"), handlers.GetFinanceStats)
			finance.POST("/balance/manual", middleware.RoleGuard("admin"), handlers.UpdateBalanceManual)
		}

		// ── Tickets ──
		tickets := protected.Group("/tickets")
		{
			tickets.GET("", handlers.GetAllTickets)
			tickets.PUT("/:id/status", handlers.UpdateTicketStatus)
		}

		// ── Notices ──
		notices := protected.Group("/notices")
		{
			notices.GET("", handlers.GetNotices)
			notices.POST("", middleware.RoleGuard("admin", "manager"), handlers.CreateNotice)
			notices.DELETE("/:id", middleware.RoleGuard("admin", "manager"), handlers.DeleteNotice)
		}

		// ── Chat ──
		chat := protected.Group("/chat")
		{
			chat.GET("/conversations", handlers.GetConversations)
			chat.GET("/history/:otherID", handlers.GetChatHistory)
			chat.POST("/send", handlers.SendMessage)
		}

		// ── Notifications ──
		notifications := protected.Group("/notifications")
		{
			notifications.GET("", handlers.GetNotifications)
			notifications.PUT("/:id/read", handlers.MarkNotificationRead)
			notifications.PUT("/read-all", handlers.MarkAllNotificationsRead)
			notifications.DELETE("/:id", handlers.DeleteNotification)
		}

		// ── Leaves ──
		leaves := protected.Group("/leaves")
		{
			leaves.POST("", handlers.ApplyLeave)
			leaves.GET("/me", handlers.GetMyLeaves)
			leaves.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllLeaves)
			leaves.PUT("/:id/review", middleware.RoleGuard("admin", "manager"), handlers.ReviewLeave)
		}
	}
}
