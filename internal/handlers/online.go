package handlers

import (
	"encoding/json"
	"strings"

	"github.com/gorilla/websocket"

	"linklian-api/internal/models"
	wsmanager "linklian-api/internal/websocket"
	"linklian-api/pkg/logger"
)

// OnlineStatusHandler handles standalone online status websocket messages.
type OnlineStatusHandler struct {
	wsManager *wsmanager.Manager
}

// NewOnlineStatusHandler creates a new online status handler.
func NewOnlineStatusHandler(wsManager *wsmanager.Manager) *OnlineStatusHandler {
	return &OnlineStatusHandler{wsManager: wsManager}
}

// HandleJoinOnline handles JOIN_ONLINE messages.
func (h *OnlineStatusHandler) HandleJoinOnline(conn *websocket.Conn, payload interface{}) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)

	var joinPayload models.JoinOnlinePayload
	if err := json.Unmarshal(payloadBytes, &joinPayload); err != nil {
		logger.Error("Failed to parse JOIN_ONLINE payload", "HandleJoinOnline", err)
		return nil
	}

	userSysID := strings.TrimSpace(joinPayload.UserSysID)
	if userSysID == "" {
		logger.Warn("JOIN_ONLINE missing user_sys_id", "HandleJoinOnline", joinPayload)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   userSysID,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)
	h.wsManager.BroadcastOnlinePresenceChanged(userSysID, true)

	return clientInfo
}

// HandleOnlineSubscribe handles ONLINE_SUBSCRIBE messages for realtime presence watch list.
func (h *OnlineStatusHandler) HandleOnlineSubscribe(clientInfo *models.ClientInfo, payload interface{}) {
	if clientInfo == nil {
		logger.Warn("ONLINE_SUBSCRIBE ignored because client is not joined", "HandleOnlineSubscribe")
		return
	}

	payloadBytes, _ := json.Marshal(payload)
	var subscribePayload models.OnlineSubscribePayload
	if err := json.Unmarshal(payloadBytes, &subscribePayload); err != nil {
		logger.Error("Failed to parse ONLINE_SUBSCRIBE payload", "HandleOnlineSubscribe", err)
		return
	}

	result, err := h.wsManager.SetOnlineSubscriptions(clientInfo.UserID, subscribePayload.UserSysIDs)
	if err != nil {
		logger.Error("Failed to set ONLINE_SUBSCRIBE watch list", "HandleOnlineSubscribe", err)
		return
	}

	if err := h.wsManager.SendOnlineSubscriptionResult(clientInfo.UserID, result); err != nil {
		logger.Error("Failed to send ONLINE_SUBSCRIPTION_RESULT", "HandleOnlineSubscribe", err)
	}
}

// HandleOnlineStatusCheck handles ONLINE_STATUS_CHECK for standalone online socket.
func (h *OnlineStatusHandler) HandleOnlineStatusCheck(clientInfo *models.ClientInfo, payload interface{}) {
	if clientInfo == nil {
		logger.Warn("ONLINE_STATUS_CHECK ignored because client is not joined", "HandleOnlineStatusCheck")
		return
	}

	payloadBytes, _ := json.Marshal(payload)
	var checkPayload models.OnlineStatusCheckPayload
	if err := json.Unmarshal(payloadBytes, &checkPayload); err != nil {
		logger.Error("Failed to parse ONLINE_STATUS_CHECK payload", "HandleOnlineStatusCheck", err)
		return
	}

	onlineUserIDs := h.wsManager.GetAllOnlineUserIDs()
	onlineSet := make(map[string]bool, len(onlineUserIDs))
	for _, userID := range onlineUserIDs {
		onlineSet[userID] = true
	}

	statuses := make(map[string]bool, len(checkPayload.UserSysIDs))
	for _, userSysID := range checkPayload.UserSysIDs {
		trimmed := strings.TrimSpace(userSysID)
		if trimmed == "" {
			continue
		}
		statuses[trimmed] = onlineSet[trimmed]
	}

	result := models.OnlineStatusResultPayload{
		Statuses:         statuses,
		OnlineUserSysIDs: onlineUserIDs,
	}

	if err := h.wsManager.SendOnlineStatusResult(clientInfo.UserID, result); err != nil {
		logger.Error("Failed to send ONLINE_STATUS_RESULT", "HandleOnlineStatusCheck", err)
	}
}

// HandleLeaveOnline handles LEAVE_ONLINE to mark a user as offline while keeping socket connected.
func (h *OnlineStatusHandler) HandleLeaveOnline(clientInfo *models.ClientInfo, payload interface{}) {
	userID := ""
	if clientInfo != nil {
		userID = strings.TrimSpace(clientInfo.UserID)
	}

	if userID == "" && payload != nil {
		payloadBytes, _ := json.Marshal(payload)
		var leavePayload models.JoinOnlinePayload
		if err := json.Unmarshal(payloadBytes, &leavePayload); err != nil {
			logger.Warn("LEAVE_ONLINE payload parse failed", "HandleLeaveOnline", err)
		} else {
			userID = strings.TrimSpace(leavePayload.UserSysID)
		}
	}

	if userID == "" {
		logger.Warn("LEAVE_ONLINE ignored because user id is empty", "HandleLeaveOnline")
		return
	}

	h.wsManager.RemoveClient(userID)
	h.wsManager.BroadcastOnlinePresenceChanged(userID, false)
}
