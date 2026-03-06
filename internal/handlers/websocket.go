package handlers

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"

	"linklian-api/internal/models"
	"linklian-api/internal/rabbitmq"
	"linklian-api/internal/repository"
	wsmanager "linklian-api/internal/websocket"
	"linklian-api/pkg/logger"
)

// WebSocketHandler handles WebSocket connections and messages
type WebSocketHandler struct {
	wsManager     *wsmanager.Manager
	rabbitManager *rabbitmq.Manager
	messageRepo   repository.MessageRepository
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(wsManager *wsmanager.Manager, rabbitManager *rabbitmq.Manager, messageRepo repository.MessageRepository) *WebSocketHandler {
	return &WebSocketHandler{
		wsManager:     wsManager,
		rabbitManager: rabbitManager,
		messageRepo:   messageRepo,
	}
}

// HandleJoinRoom handles JOIN_ROOM messages
func (h *WebSocketHandler) HandleJoinRoom(conn *websocket.Conn, payload interface{}) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var joinPayload models.JoinRoomPayload
	if err := json.Unmarshal(payloadBytes, &joinPayload); err != nil {
		logger.Error("Failed to parse JOIN_ROOM payload", "HandleJoinRoom", err)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   joinPayload.UserID,
		ChatId:   &joinPayload.ChatId,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)

	return clientInfo
}

// HandleChatSend handles CHAT_SEND messages
func (h *WebSocketHandler) HandleChatSend(clientInfo *models.ClientInfo, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var chatPayload models.ChatSendPayload
	if err := json.Unmarshal(payloadBytes, &chatPayload); err != nil {
		logger.Error("Failed to parse CHAT_SEND payload", "HandleChatSend", err)
		return
	}

	// Create chat message for local broadcast
	sendAt := time.Now().Format("15:04:05")
	chatMessage := models.ChatMessage{
		ChatId:   chatPayload.ChatId,
		SenderId: chatPayload.SenderId,
		Content:  chatPayload.Content,
		SendAt:   sendAt,
		ReplyId:  chatPayload.ReplyId,
		FileUrl:  chatPayload.FileUrl,
	}

	// Broadcast to clients in the same room
	h.wsManager.BroadcastToRoom(chatPayload.ChatId, chatPayload.SenderId, "CHAT_RECEIVE", chatMessage)

}

// HandleChatDeliver handle chat deliver event
func (h *WebSocketHandler) HandleChatDeliver(payload interface{}) {
	var p models.ChatDeliverPayload
	if err := mapstructure.WeakDecode(payload, &p); err != nil {
		logger.Error("Failed to decode CHAT_DELIVER payload", "HandleChatDeliver", err)
		return
	}

	// broadcast to client in room
	// Pass SenderId to avoid broadcasting back to sender if they are on this node
	logger.Log("Broadcasting CHAT_DELIVER to room "+p.ChatId+" from sender "+p.SenderId, "HandleChatDeliver")
	h.wsManager.BroadcastToRoom(
		p.ChatId,
		p.SenderId,
		"CHAT_RECEIVE",
		p,
	)
}
