package handlers

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	socketio "github.com/googollee/go-socket.io"
)

var SocketServer *socketio.Server

func InitSocket() {
	server := socketio.NewServer(nil)
	// Some versions of go-socket.io might need manual engine.io options
	// but nil usually works if CORS is handled by Gin.
	SocketServer = server

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		fmt.Println("connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "join", func(s socketio.Conn, room string) {
		s.Join(room)
		fmt.Printf("User %s joined room %s\n", s.ID(), room)
	})

	server.OnEvent("/", "message", func(s socketio.Conn, msg map[string]interface{}) {
		// Use a safer way to get the receiver_id
		rid, ok := msg["receiver_id"]
		if !ok {
			return
		}

		receiverID, ok := rid.(string)
		if !ok {
			return
		}

		// Also broadcast to the sender's room so other tabs of the same user see it
		sid, _ := msg["sender_id"].(string)
		if sid != "" {
			server.BroadcastToRoom("/", sid, "message", msg)
		}

		server.BroadcastToRoom("/", receiverID, "message", msg)
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		fmt.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		fmt.Println("closed", reason)
	})

	go func() {
		if err := server.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()
}

func SocketHandler(c *gin.Context) {
	SocketServer.ServeHTTP(c.Writer, c.Request)
}

func SocketCORS(c *gin.Context) {
	origin := c.Request.Header.Get("Origin")
	c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
	c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
	c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
	c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	if c.Request.Method == "OPTIONS" {
		c.AbortWithStatus(http.StatusNoContent)
		return
	}

	c.Next()
}
