package handlers

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"

	"linklian-api/internal/models"
	"linklian-api/internal/rabbitmq"
	wsmanager "linklian-api/internal/websocket"
)

// WebSocketHandler handles WebSocket connections and messages
type WebSocketHandler struct {
	wsManager     *wsmanager.Manager
	rabbitManager *rabbitmq.Manager
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(wsManager *wsmanager.Manager, rabbitManager *rabbitmq.Manager) *WebSocketHandler {
	return &WebSocketHandler{
		wsManager:     wsManager,
		rabbitManager: rabbitManager,
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
		RoomId:   &joinPayload.RoomId,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)

	// Publish event to RabbitMQ (safe)
	eventData := map[string]interface{}{
		"type": "JOIN_ROOM",
		"payload": map[string]interface{}{
			"roomId":    joinPayload.RoomId,
			"senderId":  joinPayload.UserID,
			"timestamp": time.Now().Format("15:04:05"),
		},
	}
	h.rabbitManager.SafePublishEvent(rabbitmq.EventUserJoinRoom, joinPayload.UserID, eventData)

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
	eventData := map[string]interface{}{
		"type": "REGISTER_NOTI",
		"payload": map[string]interface{}{
			"senderId":  notiPayload.SenderId,
			"timestamp": time.Now().Format("15:04:05"),
		},
	}
	h.rabbitManager.SafePublishEvent(rabbitmq.EventUserRegisterNoti, notiPayload.SenderId, eventData)

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
        RoomId:   chatPayload.RoomId,
        SenderId: chatPayload.SenderId,
        Message:  chatPayload.Message,
        SendAt:   sendAt,
    }

    // --- ส่วนที่แก้ไข: สร้าง struct ให้ตรงกับ Worker ---
    // ต้องมั่นใจว่าใน models มี struct SocketEvent หรือถ้าไม่มีให้ใช้ map หรือ struct แบบ inline
    event := struct {
        Type    string                 `json:"type"`
        Payload map[string]interface{} `json:"payload"`
    }{
        Type: "CHAT_SEND",
        Payload: map[string]interface{}{
            "roomId":   chatPayload.RoomId,
            "senderId": chatPayload.SenderId,
            "message":  chatPayload.Message,
        },
    }
    
    // ส่งไป RabbitMQ (สังเกตว่าเราส่ง event ก้อนนี้ไปตรงๆ)
    // Param แรก "CHAT_SEND" จะไม่ได้ถูกเอาไปใช้เป็น Routing Key แล้ว (ดูใน PublishEvent)
    h.rabbitManager.SafePublishEvent("CHAT_SEND", clientInfo.UserID, event)

    // Broadcast to clients in the same room
    h.wsManager.BroadcastToRoom(chatPayload.RoomId, "CHAT_RECEIVE", chatMessage)

}

// HandleReadNoti handles READ_NOTI messages
func (h *WebSocketHandler) HandleReadNoti(clientInfo *models.ClientInfo, payload interface{}) {
	// Publish read notification event to RabbitMQ (safe)
	eventData := map[string]interface{}{
		"type": "READ_NOTI",
		"payload": map[string]interface{}{
			"userID":    clientInfo.UserID,
			"payload":   payload,
			"timestamp": time.Now().Unix(),
		},
	}
	h.rabbitManager.SafePublishEvent(rabbitmq.EventReadNotification, clientInfo.UserID, eventData)
}
