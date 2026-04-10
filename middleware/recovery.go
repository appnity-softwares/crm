package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// GlobalRecovery is a middleware that prevents panics from crashing the server
func GlobalRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC RECOVERED] Context: %v\nError: %v\nStack: %s\n", c.Request.URL.Path, err, debug.Stack())
				// Abort the request with a generic 500
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "Internal Server Error: Unexpected panic encountered",
				})
			}
		}()
		c.Next()
	}
}
