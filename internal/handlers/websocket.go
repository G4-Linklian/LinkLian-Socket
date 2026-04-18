package handlers

import (
	"encoding/json"
	"fmt"
	"slices"
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

	h.wsManager.AddChatClient(clientInfo)

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

// HandleRegisterNoti handles REGISTER_NOTI messages — registers a client for notification delivery
func (h *WebSocketHandler) HandleRegisterNoti(conn *websocket.Conn, payload interface{}) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var p models.RegisterNotiPayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil || p.UserID == "" {
		logger.Error("Failed to parse REGISTER_NOTI payload", "HandleRegisterNoti", err)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   p.UserID,
		IsOnline: true,
	}

	h.wsManager.AddNotiClient(clientInfo)
	logger.Log("Client registered for notifications: "+p.UserID, "HandleRegisterNoti")
	return clientInfo
}

// HandleNotificationDeliver delivers a NOTIFICATION event from the queue to the target user
func (h *WebSocketHandler) HandleNotificationDeliver(payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var p models.NotificationDeliverPayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil {
		logger.Error("Failed to parse NOTIFICATION payload", "HandleNotificationDeliver", err)
		return
	}

	// Send the original payload (not the parsed struct) so extra fields like
	// section_id and community_id are preserved and forwarded to the Flutter client.
	if err := h.wsManager.SendNotificationToUser(p.ReceiveUserID, payload); err != nil {
		logger.Log("User offline, notification not delivered: "+p.ReceiveUserID, "HandleNotificationDeliver")
	}
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
	failedClients := h.wsManager.BroadcastToRoom(
		p.ChatId,
		p.SenderId,
		"CHAT_RECEIVE",
		p,
	)

	if p.ReceiveUserId == "" {
		return
	}

	// Determine whether receiver needs a notification:
	// 1. Not in the room at all, OR
	// 2. Was in the room but their connection was stale (BroadcastToRoom failed for them)
	inRoom := h.wsManager.IsInChatRoom(p.ReceiveUserId, p.ChatId)
	stale := slices.Contains(failedClients, p.ReceiveUserId)
	logger.Debug("IsInChatRoom result for user "+p.ReceiveUserId+" in chat "+p.ChatId+": "+fmt.Sprintf("%v", inRoom)+" stale: "+fmt.Sprintf("%v", stale), "HandleChatDeliver")

	if !inRoom || stale {
		notiPayload := map[string]interface{}{
			"notification_id": p.NotificationId,
			"feature":         "chat",
			"actor_id":        p.SenderId,
			"actor_name":      p.SenderName,
			"body":            p.Content,
			"ref_id":          p.ChatId,
			"ref_type":        "chat",
		}
		if err := h.wsManager.SendNotificationToUser(p.ReceiveUserId, notiPayload); err != nil {
			logger.Log("Receiver not on noti channel, skipping notification: "+p.ReceiveUserId, "HandleChatDeliver")
		} else {
			logger.Log("Sent chat notification to stale/offline receiver: "+p.ReceiveUserId, "HandleChatDeliver")
		}
	}
}
