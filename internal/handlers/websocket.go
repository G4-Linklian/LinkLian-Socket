package handlers

import (
	"encoding/json"
	"fmt"
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
	failedClients := h.wsManager.BroadcastToRoom(
		p.ChatId,
		p.SenderId,
		"CHAT_RECEIVE",
		p,
	)

	// delegate notification logic to notification.go
	h.sendChatNotification(p, failedClients)
}

func (h *WebSocketHandler) HandleJoinSectionRoom(conn *websocket.Conn, payload interface{}) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var joinPayload models.JoinSectionPayload

	if err := json.Unmarshal(payloadBytes, &joinPayload); err != nil {
		logger.Error("Failed to parse JOIN_SECTION_ROOM payload", "HandleJoinSectionRoom", err)
		return nil
	}

	if joinPayload.UserID == "" || joinPayload.SectionId == "" {
		logger.Warn("Invalid JOIN_SECTION_ROOM payload", "HandleJoinSectionRoom", joinPayload)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:    conn,
		UserID:    joinPayload.UserID,
		SectionId: &joinPayload.SectionId,
		IsOnline:  true,
	}

	h.wsManager.AddClient(clientInfo)

	logger.Log("User "+joinPayload.UserID+" joined Section Room: "+joinPayload.SectionId, "HandleJoinSectionRoom")

	return clientInfo
}

func (h *WebSocketHandler) HandleJoinLive(conn *websocket.Conn, payload interface{}) *models.ClientInfo {
	payloadBytes, _ := json.Marshal(payload)
	var joinPayload models.JoinLivePayload
	if err := json.Unmarshal(payloadBytes, &joinPayload); err != nil {
		logger.Error("Failed to parse JOIN_LIVE payload", "HandleJoinLive", err)
		return nil
	}

	if joinPayload.UserID == "" || joinPayload.QALiveId == "" {
		logger.Warn("Invalid JOIN_LIVE payload", "HandleJoinLive", joinPayload)
		return nil
	}

	clientInfo := &models.ClientInfo{
		Socket:   conn,
		UserID:   joinPayload.UserID,
		QALiveId: &joinPayload.QALiveId,
		IsOnline: true,
	}

	h.wsManager.AddClient(clientInfo)
	return clientInfo
}

func (h *WebSocketHandler) HandleSlideSync(conn *websocket.Conn, payload interface{}) {
	payloadBytes, err := json.Marshal(payload)
	var syncPayload models.SlideSyncPayload
	if err != nil {
		logger.Error("Failed to marshal SLIDE_SYNC payload", "HandleSlideSync", err)
		return
	}

	if err := json.Unmarshal(payloadBytes, &syncPayload); err != nil {
		logger.Error("Failed to parse SLIDE_SYNC payload", "HandleSlideSync", err)
		return
	}

	if syncPayload.QALiveId == "" {
		logger.Warn("Invalid SLIDE_SYNC payload: missing qa_live_id", "HandleSlideSync", syncPayload)
		return
	}

	logger.Log("Received SLIDE_SYNC for Live "+syncPayload.QALiveId+" from user "+syncPayload.UserID, "HandleSlideSync")

	h.wsManager.BroadcastToLiveRoom(
		syncPayload.QALiveId,
		syncPayload.UserID,
		"SLIDE_SYNC",
		payload,
	)
}

func (h *WebSocketHandler) HandleQAEvent(msg models.Message) {
	var p struct {
		QALiveId interface{} `mapstructure:"qa_live_id"`
	}

	if err := mapstructure.WeakDecode(msg.Payload, &p); err != nil {
		logger.Error("Failed to decode QA event payload", "HandleQAEvent", err)
		return
	}

	qaLiveId := fmt.Sprintf("%v", p.QALiveId)

	if qaLiveId == "" || qaLiveId == "<nil>" {
		logger.Warn("Missing qa_live_id in QA event", "HandleQAEvent", msg)
		return
	}

	if msg.Type == "QA_LIVE_STARTED" {
		var p struct {
			SectionId interface{} `mapstructure:"section_id"`
		}
		if err := mapstructure.WeakDecode(msg.Payload, &p); err != nil {
			logger.Warn("Failed to decode QA_LIVE_STARTED payload", "HandleQAEvent", err)
			return
		}

		sectionRoom := fmt.Sprintf("section_%v", p.SectionId)

		logger.Log("Broadcasting QA_LIVE_STARTED to Section Room: "+sectionRoom, "HandleQAEvent")

		h.wsManager.BroadcastToLiveRoom(
			sectionRoom,
			"",
			msg.Type,
			msg.Payload,
		)
		return
	}

	logger.Log("Broadcasting "+msg.Type+" to Live Room: "+qaLiveId, "HandleQAEvent")

	h.wsManager.BroadcastToLiveRoom(
		qaLiveId,
		"",
		msg.Type,
		msg.Payload,
	)
}
