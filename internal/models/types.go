package models

import (
	"sync"

	"github.com/gorilla/websocket"
)

// ClientInfo represents a connected websocket client for chat rooms, section rooms, and live rooms
type ClientInfo struct {
	Socket    *websocket.Conn
	UserID    string
	ChatId    *string
	SectionId *string
	OnlineWatchUserIDs map[string]struct{}
	QALiveId  *string
	IsOnline  bool
	Mutex     sync.Mutex
}

// NotiClientInfo represents a connected websocket client for notification channel only
type NotiClientInfo struct {
	Socket   *websocket.Conn
	UserID   string
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

// OnlineStatusCheckPayload represents payload for checking online status by user_sys_id list
type OnlineStatusCheckPayload struct {
	ChatId     string   `json:"chat_id,omitempty"`
	UserSysIDs []string `json:"user_sys_ids"`
}

// OnlineSubscribePayload represents payload for realtime online subscription list.
type OnlineSubscribePayload struct {
	UserSysIDs []string `json:"user_sys_ids"`
}

// JoinOnlinePayload represents payload for standalone online status socket
type JoinOnlinePayload struct {
	UserSysID string `json:"user_sys_id"`
}

// OnlineStatusResultPayload represents online status result for requested users
type OnlineStatusResultPayload struct {
	ChatId           string          `json:"chat_id"`
	Statuses         map[string]bool `json:"statuses"`
	OnlineUserSysIDs []string        `json:"online_user_sys_ids"`
}

// OnlineSubscriptionResultPayload represents the current subscription snapshot for a subscriber.
type OnlineSubscriptionResultPayload struct {
	SubscribedUserSysIDs []string        `json:"subscribed_user_sys_ids"`
	Statuses             map[string]bool `json:"statuses"`
	OnlineUserSysIDs     []string        `json:"online_user_sys_ids"`
}

// OnlinePresenceChangedPayload represents realtime presence change for one user.
type OnlinePresenceChangedPayload struct {
	UserSysID string `json:"user_sys_id"`
	IsOnline  bool   `json:"is_online"`
}

// OnlineUsersPayload represents current online users in a chat room
type OnlineUsersPayload struct {
	ChatId           string   `json:"chat_id"`
	OnlineUserSysIDs []string `json:"online_user_sys_ids"`
}

// RegisterNotiPayload represents register notification payload
type RegisterNotiPayload struct {
	UserID string `json:"user_id"`
}

// NotificationDeliverPayload represents an inbound notification event from the queue
type NotificationDeliverPayload struct {
	ReceiveUserID string `json:"receive_user_id" mapstructure:"receive_user_id"`
	ActorID       string `json:"actor_id"        mapstructure:"actor_id"`
	ActorName     string `json:"actor_name"      mapstructure:"actor_name"`
	Title         string `json:"title"           mapstructure:"title"`
	Body          string `json:"body"            mapstructure:"body"`
	RefID         string `json:"ref_id"          mapstructure:"ref_id"`
	RefType       string `json:"ref_type"        mapstructure:"ref_type"`
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
	MessageId     string  `json:"message_id" mapstructure:"message_id"`
	ChatId        string  `json:"chat_id" mapstructure:"chat_id"`
	SenderId      string  `json:"sender_id" mapstructure:"sender_id"`
	SenderName    string  `json:"sender_name" mapstructure:"sender_name"`
	ReceiveUserId string  `json:"receive_user_id" mapstructure:"receive_user_id"`
	Content       string  `json:"content" mapstructure:"content"`
	SendAt        string  `json:"send_at" mapstructure:"send_at"`
	ReplyId       *string `json:"reply_id,omitempty" mapstructure:"reply_id"`
	FileUrl       *string `json:"file,omitempty" mapstructure:"file"`
	CreatedAt     string  `json:"created_at" mapstructure:"created_at"`
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
