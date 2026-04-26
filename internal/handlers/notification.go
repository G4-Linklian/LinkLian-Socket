package handlers

import (
	"encoding/json"

	"github.com/gorilla/websocket"

	"linklian-api/internal/models"
	"linklian-api/pkg/logger"
)

// HandleRegisterNoti handles REGISTER_NOTI messages — registers a client for notification delivery
func (h *WebSocketHandler) HandleRegisterNoti(conn *websocket.Conn, payload interface{}) *models.NotiClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var p models.RegisterNotiPayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil || p.UserID == "" {
		logger.Error("Failed to parse REGISTER_NOTI payload", "HandleRegisterNoti", err)
		return nil
	}

	clientInfo := &models.NotiClientInfo{
		Socket:   conn,
		UserID:   p.UserID,
		IsOnline: true,
	}

	h.wsManager.AddNotiClient(clientInfo)
	logger.Log("Client registered for notifications: "+p.UserID, "HandleRegisterNoti")
	return clientInfo
}

// HandleNotificationDeliver delivers a NOTIFICATION event from the queue to the target user.
// For chat notifications: skips delivery if the receiver is already in that chat room
// (they receive CHAT_RECEIVE directly and don't need a badge increment).
func (h *WebSocketHandler) HandleNotificationDeliver(payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var p models.NotificationDeliverPayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil {
		logger.Error("Failed to parse NOTIFICATION payload", "HandleNotificationDeliver", err)
		return
	}

	// Skip chat notification if receiver is actively in that chat room
	if payloadMap, ok := payload.(map[string]interface{}); ok {
		if feature, _ := payloadMap["feature"].(string); feature == "chat" {
			if h.wsManager.IsInChatRoom(p.ReceiveUserID, p.RefID) {
				logger.Log("Skip chat noti: user in room "+p.RefID, "HandleNotificationDeliver")
				return
			}
		}
	}

	// Send the original payload (not the parsed struct) so extra fields like
	// section_id, community_id, and feature are preserved and forwarded to the Flutter client.
	if err := h.wsManager.SendNotificationToUser(p.ReceiveUserID, payload); err != nil {
		logger.Log("User offline, notification not delivered: "+p.ReceiveUserID, "HandleNotificationDeliver")
	}
}
