package handlers

import (
	"encoding/json"
	"fmt"
	"slices"

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

// sendChatNotification sends a notification banner to the receiver when they are
// not in the chat room or their connection was stale during broadcast
func (h *WebSocketHandler) sendChatNotification(p models.ChatDeliverPayload, failedClients []string) {
	if p.ReceiveUserId == "" {
		return
	}

	// Determine whether receiver needs a notification:
	// 1. Not in the room at all, OR
	// 2. Was in the room but their connection was stale (BroadcastToRoom failed for them)
	inRoom := h.wsManager.IsInChatRoom(p.ReceiveUserId, p.ChatId)
	stale := slices.Contains(failedClients, p.ReceiveUserId)
	logger.Debug("IsInChatRoom result for user "+p.ReceiveUserId+" in chat "+p.ChatId+": "+fmt.Sprintf("%v", inRoom)+" stale: "+fmt.Sprintf("%v", stale), "sendChatNotification")

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
			logger.Log("Receiver not on noti channel, skipping notification: "+p.ReceiveUserId, "sendChatNotification")
		} else {
			logger.Log("Sent chat notification to stale/offline receiver: "+p.ReceiveUserId, "sendChatNotification")
		}
	}
}
