package models

import (
	"sync"

	"github.com/gorilla/websocket"
)

// ClientInfo represents a connected websocket client
type ClientInfo struct {
	Socket    *websocket.Conn
	UserID    string
	ChatId    *string
	QALiveId  *string
	SectionId *string
	IsOnline  bool
	Mutex     sync.Mutex
}

// Message represents websocket message structure
type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// ChatMessage represents chat message data
type ChatMessage struct {
	MessageId string  `json:"message_id"`
	ChatId    string  `json:"chat_id"`
	SenderId  string  `json:"sender_id"`
	Content   string  `json:"content"`
	SendAt    string  `json:"send_at"`
	ReplyId   *string `json:"reply_id,omitempty"`
	FileUrl   *string `json:"file,omitempty"`
	CreatedAt string  `json:"created_at"`
}

// JoinRoomPayload represents join room message payload
type JoinRoomPayload struct {
	UserID string `json:"user_id"`
	ChatId string `json:"chat_id"`
}

// RegisterNotiPayload represents register notification payload
type RegisterNotiPayload struct {
	SenderId string `json:"sender_id"`
}

// ChatSendPayload represents chat send payload
type ChatSendPayload struct {
	ChatId    string  `json:"chat_id"`
	SenderId  string  `json:"sender_id"`
	Content   string  `json:"content"`
	ReplyId   *string `json:"reply_id,omitempty"`
	FileUrl   *string `json:"file,omitempty"`
	CreatedAt string  `json:"created_at"`
}

// ChatDeliverPayload represents chat deliver payload
type ChatDeliverPayload struct {
	MessageId string  `json:"message_id" mapstructure:"message_id"`
	ChatId    string  `json:"chat_id" mapstructure:"chat_id"`
	SenderId  string  `json:"sender_id" mapstructure:"sender_id"`
	Content   string  `json:"content" mapstructure:"content"`
	SendAt    string  `json:"send_at" mapstructure:"send_at"`
	ReplyId   *string `json:"reply_id,omitempty" mapstructure:"reply_id"`
	FileUrl   *string `json:"file,omitempty" mapstructure:"file"`
	CreatedAt string  `json:"created_at" mapstructure:"created_at"`
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

// JoinLivePayload represents join live room payload for Q&A flow
type JoinLivePayload struct {
	UserID   string `json:"user_id"`
	QALiveId string `json:"qa_live_id"`
}

type JoinSectionPayload struct {
	UserID    string `json:"user_id"`
	SectionId string `json:"section_id"`
}

type SlideSyncPayload struct {
	QALiveId    string `json:"qa_live_id"`
	SlideNumber int    `json:"slide_number"`
	UserID      string `json:"user_id"`
}
