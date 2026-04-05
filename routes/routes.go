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
		// ─── Auth (Public) ───
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
			portal.POST("/:token/tickets", handlers.CreateTicket)
			portal.POST("/:token/comments", handlers.PortalPostComment)
			portal.GET("/:token/tickets", handlers.GetProjectTickets)
			portal.POST("/:token/sow/accept", handlers.PortalAcceptSOW)
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
			employees.GET("/:id", middleware.RoleGuard("admin", "manager", "employee"), handlers.GetEmployee)
			employees.GET("/:id/stats", middleware.RoleGuard("admin", "manager"), handlers.GetEmployeeStats)
			employees.POST("", middleware.RoleGuard("admin"), handlers.CreateEmployee)
			employees.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateEmployee)
			employees.PUT("/:id/activate", middleware.RoleGuard("admin"), handlers.ActivateEmployee)
			employees.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteEmployee)
		}

		// ── Clients (admin-controlled) ──
		clients := protected.Group("/clients")
		{
			clients.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetClients)
			clients.GET("/:id", middleware.RoleGuard("admin", "manager", "client"), handlers.GetClient)
			clients.POST("", middleware.RoleGuard("admin"), handlers.CreateClient)
			clients.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateClient)
			clients.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteClient)
		}

		// ── Attendance (internal roles only) ──
		attendance := protected.Group("/attendance")
		{
			attendance.POST("/check-in", middleware.RoleGuard("admin", "manager", "employee", "trainee"), handlers.CheckIn)
			attendance.PUT("/check-out", middleware.RoleGuard("admin", "manager", "employee", "trainee"), handlers.CheckOut)
			attendance.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllAttendance)
			attendance.GET("/me", middleware.RoleGuard("admin", "manager", "employee", "trainee"), handlers.GetMyAttendance)
			attendance.GET("/qr-token", middleware.RoleGuard("admin"), handlers.GenerateQRToken)
			attendance.POST("/qr-checkin", middleware.RoleGuard("admin", "manager", "employee", "trainee"), handlers.QRCheckIn)
			attendance.POST("/manual", middleware.RoleGuard("admin"), handlers.ManualAttendance)
			attendance.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateAttendance)
			attendance.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteAttendance)
		}

		// ── Work Logs (internal roles only) ──
		worklogs := protected.Group("/worklogs")
		{
			worklogs.POST("", middleware.RoleGuard("admin", "manager", "employee"), handlers.CreateWorkLog)
			worklogs.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllWorkLogs)
			worklogs.GET("/me", middleware.RoleGuard("admin", "manager", "employee"), handlers.GetMyWorkLogs)
			worklogs.PUT("/:id", middleware.RoleGuard("admin", "manager", "employee"), handlers.UpdateWorkLog)
			worklogs.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteWorkLog)
		}

		// ── Daily Reports (internal roles only) ──
		reports := protected.Group("/reports")
		{
			reports.POST("", middleware.RoleGuard("admin", "manager", "employee"), handlers.CreateDailyReport)
			reports.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllDailyReports)
			reports.GET("/me", middleware.RoleGuard("admin", "manager", "employee"), handlers.GetMyDailyReports)
			reports.PUT("/:id", middleware.RoleGuard("admin", "manager", "employee"), handlers.UpdateDailyReport)
			reports.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteDailyReport)
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
			projects.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteProject)
			projects.POST("/:id/assign", middleware.RoleGuard("admin", "manager"), handlers.AssignMember)
			projects.POST("/:id/transfer", middleware.RoleGuard("admin", "manager"), handlers.TransferMember)
			projects.PUT("/:id/approve", middleware.RoleGuard("admin", "manager"), handlers.ApproveProjectUpdate)
			projects.DELETE("/:id/members/:uid", middleware.RoleGuard("admin", "manager"), handlers.RemoveMember)

			// Tasks
			projects.GET("/:id/tasks", handlers.GetProjectTasks)
			projects.POST("/tasks", middleware.RoleGuard("admin", "manager", "employee"), handlers.CreateTask)
			projects.PUT("/tasks/:id", middleware.RoleGuard("admin", "manager", "employee"), handlers.UpdateTask)
			projects.DELETE("/tasks/:id", middleware.RoleGuard("admin", "manager"), handlers.DeleteTask)

			// Updates
			projects.POST("/updates", middleware.RoleGuard("admin", "manager", "employee"), handlers.CreateProjectUpdate)
			projects.GET("/:id/updates", handlers.GetProjectUpdates)
			projects.POST("/updates/comments", handlers.CreateProjectComment)
			projects.GET("/updates/:update_id/comments", handlers.GetProjectComments)
			projects.POST("/:id/sign", handlers.SignProjectSOW)
		}

		// ── Payroll ──
		payroll := protected.Group("/payroll")
		{
			payroll.POST("", middleware.RoleGuard("admin"), handlers.CreatePayroll)
			payroll.GET("", middleware.RoleGuard("admin"), handlers.GetAllPayroll)
			payroll.GET("/me", middleware.RoleGuard("admin", "manager", "employee"), handlers.GetMyPayroll)
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
			leads.PUT("/:id", middleware.RoleGuard("admin", "manager", "prospect"), handlers.UpdateLead)
			leads.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteLead)
			leads.POST("/:id/convert", middleware.RoleGuard("admin", "manager"), handlers.ConvertLeadToClient)

			// Prospect tools
			leads.POST("/requirement", middleware.RoleGuard("prospect"), handlers.SubmitRequirement)
			leads.GET("/my-profile", middleware.RoleGuard("prospect"), handlers.GetMyLeadProfile)
			leads.POST("/:id/sow/accept", middleware.RoleGuard("prospect"), handlers.AcceptLeadSOW)
		}

		// ── Expenses ──
		expenses := protected.Group("/expenses")
		{
			expenses.POST("", middleware.RoleGuard("admin"), handlers.CreateExpense)
			expenses.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllExpenses)
			expenses.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateExpense)
			expenses.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteExpense)
		}

		// ── Income ──
		income := protected.Group("/income")
		{
			income.POST("", middleware.RoleGuard("admin"), handlers.CreateIncome)
			income.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllIncome)
			income.PUT("/:id", middleware.RoleGuard("admin"), handlers.UpdateIncome)
			income.DELETE("/:id", middleware.RoleGuard("admin"), handlers.DeleteIncome)
		}

		// ── Configs & Flags (admin) ──
		configs := protected.Group("/configs")
		{
			configs.GET("/flags", middleware.RoleGuard("admin"), handlers.GetFeatureFlags)
			configs.PATCH("/flags/:key", middleware.RoleGuard("admin"), handlers.ToggleFeatureFlagEx)
			configs.GET("/audit", middleware.RoleGuard("admin"), handlers.GetAuditLogs)
		}

		// ── Finance (Balance) ──
		finance := protected.Group("/finance")
		{
			finance.GET("/balance", handlers.GetBalance)
			finance.GET("/stats", middleware.RoleGuard("admin", "manager"), handlers.GetFinanceStats)
			finance.GET("/analytics", middleware.RoleGuard("admin", "manager"), handlers.GetFinanceAnalytics)
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
			chat.GET("/permissions", handlers.GetChatPermissions)
			chat.POST("/permissions/request", handlers.RequestChatPermission)
			chat.PUT("/permissions/:id", middleware.RoleGuard("admin"), handlers.UpdateChatPermission)
			chat.PUT("/:id", handlers.EditMessage)
			chat.DELETE("/:id", handlers.DeleteMessage)
		}

		// ── Notifications ──
		notifications := protected.Group("/notifications")
		{
			notifications.GET("", handlers.GetNotifications)
			notifications.PUT("/:id/read", handlers.MarkNotificationRead)
			notifications.PUT("/read-all", handlers.MarkAllNotificationsRead)
			notifications.DELETE("/:id", handlers.DeleteNotification)

			// FCM device token management
			notifications.POST("/token", handlers.SaveFCMToken)
			notifications.DELETE("/token", handlers.RemoveFCMToken)

			// Preferences
			notifications.GET("/types", handlers.GetNotificationTypes)
			notifications.GET("/preferences", handlers.GetPreferences)
			notifications.PUT("/preferences", handlers.UpdatePreferences)
		}

		// ── Leaves (internal roles only) ──
		leaves := protected.Group("/leaves")
		{
			leaves.POST("", middleware.RoleGuard("admin", "manager", "employee"), handlers.ApplyLeave)
			leaves.GET("/me", middleware.RoleGuard("admin", "manager", "employee"), handlers.GetMyLeaves)
			leaves.GET("", middleware.RoleGuard("admin", "manager"), handlers.GetAllLeaves)
			leaves.PUT("/:id/review", middleware.RoleGuard("admin", "manager"), handlers.ReviewLeave)
		}

		// ── Training (Admins/Managers) ──
		training := protected.Group("/training")
		{
			// Courses
			training.POST("/courses", middleware.RoleGuard("admin", "manager"), handlers.CreateCourse)
			training.GET("/courses", handlers.GetCourses)
			training.PUT("/courses/:id", middleware.RoleGuard("admin", "manager"), handlers.UpdateCourse)
			training.DELETE("/courses/:id", middleware.RoleGuard("admin", "manager"), handlers.DeleteCourse)

			// Enrollments
			training.POST("/enrollments", middleware.RoleGuard("admin", "manager"), handlers.EnrollStudent)
			training.GET("/enrollments", middleware.RoleGuard("admin", "manager"), handlers.GetEnrollments)
			training.PUT("/enrollments/:id", middleware.RoleGuard("admin", "manager", "trainee"), handlers.UpdateEnrollment)
			training.POST("/enrollments/:id/payments", middleware.RoleGuard("admin", "manager"), handlers.AddEnrollmentPayment)
			training.GET("/enrollments/me", middleware.RoleGuard("trainee", "alumni"), handlers.GetMyEnrollments)
		}

	}
}
