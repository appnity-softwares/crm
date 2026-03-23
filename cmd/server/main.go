package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/handlers"
	"github.com/pushp314/erp-crm/middleware"
	"github.com/pushp314/erp-crm/models"
	"github.com/pushp314/erp-crm/routes"
	notif "github.com/pushp314/erp-crm/services/notification"
	"github.com/pushp314/erp-crm/services/notification/channels"
)

func main() {
	// Load configuration
	config.LoadConfig()

	// Connect to database and run migrations
	database.Connect()

	// Auto-migrate FCM token table
	database.DB.AutoMigrate(&models.FCMToken{})

	// Seed admin user and configs
	database.SeedAdmin()
	database.SeedConfigs()

	// Initialize Socket.io
	handlers.InitSocket()

	// ─── Initialize Notification Service ──────────────────────
	initNotificationService()

	// Initialize Notification Preferences
	ps := notif.NewPreferenceService()
	// Seed preferences for all active users asynchronously so it doesn't block startup
	go ps.SeedAllUsers()

	// Start background tasks
	handlers.StartAutoCheckoutTask()

	// Setup Gin router
	r := gin.Default()

	// Global Security Headers
	r.Use(middleware.SecurityHeaders())

	// ─── Hardened CORS middleware ─────────────────────────────
	// Build allowed origins from environment or defaults
	allowedOrigins := buildAllowedOrigins()

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if isOriginAllowed(origin, allowedOrigins) {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Auth Rate Limiter (5 requests per 5 seconds for same IP)
	authLimiter := middleware.NewIPRateLimiter(1, 5)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "time": time.Now().Format(time.RFC3339)})
	})

	// Socket.io routes
	r.GET("/socket.io/*any", handlers.SocketCORS, handlers.SocketHandler)
	r.POST("/socket.io/*any", handlers.SocketCORS, handlers.SocketHandler)

	// Register all routes
	routes.SetupRoutes(r, authLimiter)

	// Start server with Graceful Shutdown support
	port := config.AppConfig.Port
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Initializing the server in a goroutine so that it won't block the graceful shutdown handling below
	go func() {
		log.Printf("🚀 ERP-CRM Server starting on port %s in %s mode", port, gin.Mode())
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Listen error: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}

// buildAllowedOrigins returns a set of allowed CORS origins
func buildAllowedOrigins() map[string]bool {
	allowed := map[string]bool{}

	// Check for env-configured origins (comma-separated)
	if envOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); envOrigins != "" {
		for _, o := range strings.Split(envOrigins, ",") {
			allowed[strings.TrimSpace(o)] = true
		}
	}

	// Always allow in development mode
	if gin.Mode() != gin.ReleaseMode {
		allowed["http://localhost:5173"] = true
		allowed["http://localhost:3000"] = true
		allowed["http://localhost:8080"] = true
		allowed["http://127.0.0.1:5173"] = true
		allowed["http://127.0.0.1:3000"] = true
	}

	return allowed
}

// isOriginAllowed checks if origin is in the whitelist
func isOriginAllowed(origin string, allowed map[string]bool) bool {
	if origin == "" {
		return false
	}
	// In dev mode with empty whitelist, allow all
	if gin.Mode() != gin.ReleaseMode && len(allowed) == 0 {
		return true
	}
	// If whitelist is configured, enforce it
	if len(allowed) > 0 {
		return allowed[origin]
	}
	// In production with no configured origins, deny all cross-origin
	return false
}

// initNotificationService sets up the multi-channel notification service.
func initNotificationService() {
	// 1. In-App channel (DB + Socket.io real-time)
	inApp := channels.NewInAppChannel(handlers.SocketServer)

	// 2. FCM channel (push notifications — gracefully disabled if no credentials)
	fcm, err := channels.NewFCMChannel()
	if err != nil {
		log.Printf("⚠️  FCM initialization failed: %v — push notifications disabled", err)
		// Still create the service with just in-app
		notif.NewService(inApp)
		return
	}

	notif.NewService(inApp, fcm)
	log.Println("✅ Notification service initialized with channels: in_app, fcm")
}
