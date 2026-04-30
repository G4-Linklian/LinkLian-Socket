package handlers

import (
	"encoding/json"
	"strings"

	"github.com/gorilla/websocket"

	"linklian-api/internal/models"
	wsmanager "linklian-api/internal/websocket"
	"linklian-api/pkg/logger"
)

// NotificationHandler handles notification socket messages.
type NotificationHandler struct {
	wsManager *wsmanager.Manager
}

// NewNotificationHandler creates a new notification handler.
func NewNotificationHandler(wsManager *wsmanager.Manager) *NotificationHandler {
	return &NotificationHandler{wsManager: wsManager}
}

// HandleRegister handles REGISTER_NOTI messages.
func (h *NotificationHandler) HandleRegister(conn *websocket.Conn, payload interface{}, current *models.ClientInfo) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var registerPayload struct {
		UserSysID string `json:"user_sys_id"`
	}

	logger.Log("NotificationHandler - REGISTER_NOTI payload", "HandleRegister", payload)

	if err := json.Unmarshal(payloadBytes, &registerPayload); err != nil {
		logger.Error("Failed to parse REGISTER_NOTI payload", "HandleRegister", err)
		return nil
	}

	userID := strings.TrimSpace(registerPayload.UserSysID)
	if userID == "" {
		logger.Warn("REGISTER_NOTI missing user_sys_id", "HandleRegister", registerPayload)
		return nil
	}

	if current != nil && current.UserID == userID {
		current.IsOnline = true
		return current
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   userID,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)
	logger.Log("Registered notification client "+userID, "HandleRegister")
	return clientInfo
}

// HandleSendNoti handles SEND_NOTIFICATION messages.
func (h *NotificationHandler) HandleSendNoti(clientInfo *models.ClientInfo, payload interface{}) {
    payloadBytes, _ := json.Marshal(payload)
    var sendPayload struct {
        SenderID         string   `json:"sender_id"`
        TargetUserSysIDs []string `json:"target_user_sys_ids"`
        RefID           *string  `json:"ref_id,omitempty"`
        Title            string   `json:"title,omitempty"`
        Body             string   `json:"body,omitempty"`
        CreatedAt        string   `json:"created_at,omitempty"`
    }

    if err := json.Unmarshal(payloadBytes, &sendPayload); err != nil {
        logger.Error("Failed to parse SEND_NOTIFICATION payload", "HandleSendNoti", err)
        return
    }

    var senderID string
    if sendPayload.SenderID != "" {
        senderID = strings.TrimSpace(sendPayload.SenderID)
    } else if clientInfo != nil {
        senderID = clientInfo.UserID
    }

    if senderID == "" {
        logger.Warn("SEND_NOTIFICATION ignored because sender_id is missing and client is not registered", "HandleSendNoti")
        return
    }

    if len(sendPayload.TargetUserSysIDs) == 0 {
        logger.Warn("SEND_NOTIFICATION missing target_user_sys_ids", "HandleSendNoti", sendPayload)
        return
    }

    notificationPayload := map[string]interface{}{
        "sender_id":           senderID,
        "target_user_sys_ids": sendPayload.TargetUserSysIDs,
        "ref_id":              sendPayload.RefID,
        "title":               sendPayload.Title,
        "body":                sendPayload.Body,
        "created_at":          sendPayload.CreatedAt,
    }

    for _, targetUserID := range sendPayload.TargetUserSysIDs {
        targetUserID = strings.TrimSpace(targetUserID)
        if targetUserID == "" {
            continue
        }

        if err := h.wsManager.SendNotificationToUser(targetUserID, notificationPayload); err != nil {
            logger.Warn("Failed to send notification to user "+targetUserID, "HandleSendNoti", err)
        }
    }

    logger.Log("Processed SEND_NOTIFICATION from "+senderID, "HandleSendNoti")
}

// HandleRead handles READ_NOTI messages.
func (h *NotificationHandler) HandleRead(clientInfo *models.ClientInfo, payload interface{}) {
	if clientInfo == nil {
		logger.Warn("READ_NOTI ignored because client is not registered", "HandleRead")
		return
	}

	logger.Debug("Received READ_NOTI message", "HandleRead", payload)
}
