package models

import (
	"sync"

	"github.com/gorilla/websocket"
)

// ClientInfo represents a connected websocket client
type ClientInfo struct {
	Socket   *websocket.Conn
	UserID   string
	RoomId   *string
	IsOnline bool
	Mutex    sync.Mutex
}

// Message represents websocket message structure
type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// ChatMessage represents chat message data
type ChatMessage struct {
	MessageID string `json:"message_id"`
	RoomId    string `json:"roomId"`
	SenderId  string `json:"senderId"`
	Message   string `json:"message"`
	SendAt    string `json:"send_at"`
}

// JoinRoomPayload represents join room message payload
type JoinRoomPayload struct {
	UserID string `json:"userID"`
	RoomId string `json:"roomId"`
}

// RegisterNotiPayload represents register notification payload
type RegisterNotiPayload struct {
	SenderId string `json:"senderId"`
}

// ChatSendPayload represents chat send payload
type ChatSendPayload struct {
	RoomId   string `json:"roomId"`
	SenderId string `json:"senderId"`
	Message  string `json:"message"`
}

// Event represents RabbitMQ message structure
type Event struct {
	Type      string      `json:"type"`
	UserID    string      `json:"user_id"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

// HealthResponse represents health check response
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp int64  `json:"timestamp"`
	Clients   int    `json:"clients"`
}


// SocketEvent represents the structure of events sent over WebSocket
type SocketEvent struct {
    Type    string                 `json:"type"`
    Payload map[string]interface{} `json:"payload"`
}