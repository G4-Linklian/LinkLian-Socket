package handlers

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"

	"linklian-api/internal/models"
	"linklian-api/internal/rabbitmq"
	"linklian-api/internal/repository"
	wsmanager "linklian-api/internal/websocket"
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
		log.Printf("❌ Failed to parse JOIN_ROOM payload: %v", err)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   joinPayload.UserID,
		ChatId:   &joinPayload.ChatId,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)

	// Publish event to RabbitMQ (safe)
	// eventData := map[string]interface{}{
	// 	"type": "JOIN_ROOM",
	// 	"payload": map[string]interface{}{
	// 		"chat_id":   joinPayload.ChatId,
	// 		"sender_id": joinPayload.UserID,
	// 		"timestamp": time.Now().Format("15:04:05"),
	// 	},
	// }
	// h.rabbitManager.SafePublishEvent(rabbitmq.EventUserJoinRoom, joinPayload.UserID, eventData)

	return clientInfo
}

// HandleRegisterNoti handles REGISTER_NOTI messages
func (h *WebSocketHandler) HandleRegisterNoti(conn *websocket.Conn, payload interface{}) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var notiPayload models.RegisterNotiPayload
	if err := json.Unmarshal(payloadBytes, &notiPayload); err != nil {
		log.Printf("❌ Failed to parse REGISTER_NOTI payload: %v", err)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   notiPayload.SenderId,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)

	// Publish event to RabbitMQ (safe)
	// eventData := map[string]interface{}{
	// 	"type": "REGISTER_NOTI",
	// 	"payload": map[string]interface{}{
	// 		"senderId":  notiPayload.SenderId,
	// 		"timestamp": time.Now().Format("15:04:05"),
	// 	},
	// }
	// h.rabbitManager.SafePublishEvent(rabbitmq.EventUserRegisterNoti, notiPayload.SenderId, eventData)

	return clientInfo
}

// HandleChatSend handles CHAT_SEND messages
func (h *WebSocketHandler) HandleChatSend(clientInfo *models.ClientInfo, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var chatPayload models.ChatSendPayload
	if err := json.Unmarshal(payloadBytes, &chatPayload); err != nil {
		log.Printf("❌ Failed to parse CHAT_SEND payload: %v", err)
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

	// event := struct {
	// 	Type    string                 `json:"type"`
	// 	Payload map[string]interface{} `json:"payload"`
	// }{
	// 	Type: "CHAT_SEND",
	// 	Payload: map[string]interface{}{
	// 		"chat_id":   chatPayload.ChatId,
	// 		"sender_id": chatPayload.SenderId,
	// 		"content":   chatPayload.Content,
	// 		"reply_id":  chatPayload.ReplyId,
	// 		"file_url":  chatPayload.FileUrl,
	// 	},
	// }

	// ส่งไป RabbitMQ (สังเกตว่าเราส่ง event ก้อนนี้ไปตรงๆ)
	// Param แรก "CHAT_SEND" จะไม่ได้ถูกเอาไปใช้เป็น Routing Key แล้ว (ดูใน PublishEvent)
	// h.rabbitManager.SafePublishEvent("CHAT_SEND", clientInfo.UserID, event)

	// Broadcast to clients in the same room
	h.wsManager.BroadcastToRoom(chatPayload.ChatId, chatPayload.SenderId, "CHAT_RECEIVE", chatMessage)

}

// HandleChatDeliver handle chat deliver event
func (h *WebSocketHandler) HandleChatDeliver(payload interface{}) {
	var p models.ChatDeliverPayload
	if err := mapstructure.Decode(payload, &p); err != nil {
		log.Printf("❌ Failed to decode CHAT_DELIVER payload: %v", err)
		return
	}

	// update status (Optional: if we have repo access)
	// if h.messageRepo != nil {
	// 	h.messageRepo.MarkDelivered(p.MessageId)
	// }

	// broadcast to client in room
	// Pass SenderId to avoid broadcasting back to sender if they are on this node
	log.Printf("🚀 Broadcasting CHAT_DELIVER to room %s from sender %s", p.ChatId, p.SenderId)
	h.wsManager.BroadcastToRoom(
		p.ChatId,
		p.SenderId,
		"CHAT_RECEIVE",
		p,
	)
}

// HandleReadNoti handles READ_NOTI messages
func (h *WebSocketHandler) HandleReadNoti(clientInfo *models.ClientInfo, payload interface{}) {
	// Publish read notification event to RabbitMQ (safe)
	// eventData := map[string]interface{}{
	// 	"type": "READ_NOTI",
	// 	"payload": map[string]interface{}{
	// 		"userID":    clientInfo.UserID,
	// 		"payload":   payload,
	// 		"timestamp": time.Now().Unix(),
	// 	},
	// }
	// h.rabbitManager.SafePublishEvent(rabbitmq.EventReadNotification, clientInfo.UserID, eventData)
}
