package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/pushp314/erp-crm/config"
	"github.com/pushp314/erp-crm/database"
	"github.com/pushp314/erp-crm/handlers"
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

	// CORS middleware
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "ERP-CRM API",
		})
	})

	// Socket.io routes
	r.GET("/socket.io/*any", handlers.SocketCORS, handlers.SocketHandler)
	r.POST("/socket.io/*any", handlers.SocketCORS, handlers.SocketHandler)

	// Register all routes
	routes.SetupRoutes(r)

	// Start server
	port := config.AppConfig.Port
	log.Printf("🚀 ERP-CRM Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}
