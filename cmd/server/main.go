package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/handlers"
	"github.com/pushp314/erp-crm/middleware"
	"github.com/pushp314/erp-crm/routes"
)

func main() {
	// Load configuration
	config.LoadConfig()

	// Connect to database and run migrations
	database.Connect()

	// Seed admin user and configs
	database.SeedAdmin()
	database.SeedConfigs()

	// Initialize Socket.io
	handlers.InitSocket()

	// Setup Gin router
	r := gin.Default()

	// Global Security Headers
	r.Use(middleware.SecurityHeaders())

	// Hardened CORS middleware
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// In production, you should check 'origin' against a whitelist
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else if gin.Mode() != gin.ReleaseMode {
			c.Header("Access-Control-Allow-Origin", "*")
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
	// Note: We'll manually inject rate limit for auth in SetupRoutes or here
	routes.SetupRoutes(r, authLimiter)

	// Start server with Graceful Shutdown support
	port := config.AppConfig.Port
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
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
