package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"

	"linklian-api/internal/models"
	"linklian-api/pkg/logger"
)

// Manager handles WebSocket connections and operations
type Manager struct {
	clients      map[string]*models.ClientInfo
	clientsMutex sync.RWMutex
	upgrader     websocket.Upgrader
	redisClient  *redis.Client
}

// NewManager creates a new WebSocket manager
func NewManager() *Manager {
	return &Manager{
		clients: make(map[string]*models.ClientInfo),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Allow all origins for development - adjust for production
				return true
			},
		},
	}
}

func NewManagerWithRedis(rdb *redis.Client) *Manager {
	m := NewManager()
	m.redisClient = rdb
	return m
}

// AddClient adds a client to the manager
func (m *Manager) AddClient(client *models.ClientInfo) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	m.clients[client.UserID] = client

	if client.QALiveId != nil {
		go m.handleJoinLiveState(*client.QALiveId, client)
	}
}

// RemoveClient removes a client from the manager
func (m *Manager) RemoveClient(userID string) {
	m.clientsMutex.Lock()

	client, exists := m.clients[userID]

	var lastLiveId *string
	if exists && client.QALiveId != nil {
		liveIdStr := *client.QALiveId
		lastLiveId = &liveIdStr
	}

	if exists {
		delete(m.clients, userID)
	}

	m.clientsMutex.Unlock()

	if lastLiveId != nil {
		go m.handleLeaveLiveState(*lastLiveId)
	}
}

// GetClient gets a client by userID
func (m *Manager) GetClient(userID string) (*models.ClientInfo, bool) {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()
	client, exists := m.clients[userID]
	return client, exists
}

// GetClientsCount returns the number of connected clients
func (m *Manager) GetClientsCount() int {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()
	return len(m.clients)
}

// BroadcastToRoom broadcasts a message to all clients in a room
func (m *Manager) BroadcastToRoom(chatId string, senderId string, messageType string, data interface{}) {
	response := map[string]interface{}{
		"type":    messageType,
		"payload": data,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal broadcast message", "BroadcastToRoom", err)
		return
	}

	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	for _, client := range m.clients {

		// if want to sender recieve message, remove this check
		if client.UserID == senderId {
			continue
		}

		if client.ChatId != nil && *client.ChatId == chatId && client.IsOnline {
			client.Mutex.Lock()
			err := client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
			client.Mutex.Unlock()

			if err != nil {
				logger.Error("Failed to send message to client "+client.UserID, "BroadcastToRoom", err)
				go m.RemoveClient(client.UserID)
			}
		}
	}
}

// GetOnlineUserIDsByChat returns sorted online user IDs in a chat room.
func (m *Manager) GetOnlineUserIDsByChat(chatId string) []string {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	userIDs := make([]string, 0)
	for _, client := range m.clients {
		if client.ChatId != nil && *client.ChatId == chatId && client.IsOnline {
			userIDs = append(userIDs, client.UserID)
		}
	}

	sort.Strings(userIDs)
	return userIDs
}

// BroadcastOnlineUsers broadcasts the current online user list to all users in the given chat room.
func (m *Manager) BroadcastOnlineUsers(chatId string) {
	payload := models.OnlineUsersPayload{
		ChatId:           chatId,
		OnlineUserSysIDs: m.GetOnlineUserIDsByChat(chatId),
	}

	m.BroadcastToRoom(chatId, "", "ONLINE_USERS", payload)
}

// GetAllOnlineUserIDs returns all online user IDs in this manager.
func (m *Manager) GetAllOnlineUserIDs() []string {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	userIDs := make([]string, 0)
	for _, client := range m.clients {
		if client.IsOnline {
			userIDs = append(userIDs, client.UserID)
		}
	}

	sort.Strings(userIDs)
	return userIDs
}

// BroadcastToAllOnline broadcasts a message to all online clients in this manager.
func (m *Manager) BroadcastToAllOnline(messageType string, data interface{}) {
	response := map[string]interface{}{
		"type":    messageType,
		"payload": data,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal global broadcast message", "BroadcastToAllOnline", err)
		return
	}

	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	for _, client := range m.clients {
		if !client.IsOnline {
			continue
		}

		client.Mutex.Lock()
		err := client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
		client.Mutex.Unlock()

		if err != nil {
			logger.Error("Failed to send global message to client "+client.UserID, "BroadcastToAllOnline", err)
			go m.RemoveClient(client.UserID)
		}
	}
}

// BroadcastAllOnlineUsers broadcasts all online user IDs to all clients in this manager.
func (m *Manager) BroadcastAllOnlineUsers() {
	payload := map[string]interface{}{
		"online_user_sys_ids": m.GetAllOnlineUserIDs(),
	}

	m.BroadcastToAllOnline("ONLINE_USERS", payload)
}

// SendOnlineStatusResult sends online status check result back to a specific user.
func (m *Manager) SendOnlineStatusResult(targetUserID string, payload models.OnlineStatusResultPayload) error {
	client, exists := m.GetClient(targetUserID)

	if !exists || !client.IsOnline {
		return ErrUserOffline
	}

	response := map[string]interface{}{
		"type":    "ONLINE_STATUS_RESULT",
		"payload": payload,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal online status result", "SendOnlineStatusResult", err)
		return err
	}

	client.Mutex.Lock()
	err = client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
	client.Mutex.Unlock()

	if err != nil {
		logger.Error("Failed to send online status result to user "+targetUserID, "SendOnlineStatusResult", err)
		m.RemoveClient(targetUserID)
		return err
	}

	return nil
}

// BroadcastToLiveRoom broadcasts a message to all clients in a Q&A live room.
func (m *Manager) BroadcastToLiveRoom(qaLiveId string, senderId string, messageType string, data interface{}) {
	response := map[string]interface{}{
		"type":    messageType,
		"payload": data,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal live broadcast message", "BroadcastToLiveRoom", err)
		return
	}

	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	for _, client := range m.clients {
		if client.UserID == senderId {
			continue
		}

		isMatchLive := client.QALiveId != nil && *client.QALiveId == qaLiveId

		isMatchSection := client.SectionId != nil && ("section_"+*client.SectionId) == qaLiveId

		if (isMatchLive || isMatchSection) && client.IsOnline {
			client.Mutex.Lock()
			err := client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
			client.Mutex.Unlock()

			if err != nil {
				logger.Error("Failed to send live message to client "+client.UserID, "BroadcastToLiveRoom", err)
				go m.RemoveClient(client.UserID)
			}
		}
	}
}

// SendNotificationToUser sends a notification to a specific user
func (m *Manager) SendNotificationToUser(targetUserID string, notiData interface{}) error {
	client, exists := m.GetClient(targetUserID)

	if !exists || !client.IsOnline {
		return ErrUserOffline
	}

	response := map[string]interface{}{
		"type":    "NOTIFICATION",
		"payload": notiData,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal notification", "SendNotificationToUser", err)
		return err
	}

	client.Mutex.Lock()
	err = client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
	client.Mutex.Unlock()

	if err != nil {
		logger.Error("Failed to send notification to user "+targetUserID, "SendNotificationToUser", err)
		m.RemoveClient(targetUserID)
		return err
	}

	logger.Log("Notification sent to user "+targetUserID, "SendNotificationToUser")
	return nil
}

// UpgradeConnection upgrades HTTP connection to WebSocket
func (m *Manager) UpgradeConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return m.upgrader.Upgrade(w, r, nil)
}

// DeclareResources declares necessary RabbitMQ resources (exchanges, queues, bindings)
func (m *Manager) handleJoinLiveState(qaLiveId string, client *models.ClientInfo) {
	ctx := context.Background()

	countKey := fmt.Sprintf("live:room:%s:viewers", qaLiveId)
	count, err := m.redisClient.Incr(ctx, countKey).Result()
	if err == nil {
		m.BroadcastToLiveRoom(qaLiveId, "", "VIEWER_COUNT_UPDATED", map[string]interface{}{"count": count})
	}

	stateKey := fmt.Sprintf("qa_live:%s:active_slide", qaLiveId)
	stateStr, err := m.redisClient.Get(ctx, stateKey).Result()

	if err == nil && stateStr != "" {
		var state map[string]interface{}

		if unmarshalErr := json.Unmarshal([]byte(stateStr), &state); unmarshalErr != nil {
			logger.Warn("Failed to unmarshal live state", "WebSocket", unmarshalErr)
			return
		}

		msgBytes, marshalErr := json.Marshal(map[string]interface{}{
			"type":    "LIVE_CURRENT_STATE",
			"payload": state,
		})
		if marshalErr != nil {
			logger.Warn("Failed to marshal LIVE_CURRENT_STATE message", "WebSocket", marshalErr)
			return
		}

		client.Mutex.Lock()
		writeErr := client.Socket.WriteMessage(websocket.TextMessage, msgBytes)
		client.Mutex.Unlock()

		if writeErr != nil {
			logger.Warn("Failed to send LIVE_CURRENT_STATE to client", "WebSocket", writeErr)
		}
	}
}

func (m *Manager) handleLeaveLiveState(qaLiveId string) {
	ctx := context.Background()

	countKey := fmt.Sprintf("live:room:%s:viewers", qaLiveId)
	count, err := m.redisClient.Decr(ctx, countKey).Result()

	if err == nil {
		if count < 0 {
			m.redisClient.Set(ctx, countKey, 0, 0)
			count = 0
		}
		m.BroadcastToLiveRoom(qaLiveId, "", "VIEWER_COUNT_UPDATED", map[string]interface{}{"count": count})
	}
}

// SetOnlineSubscriptions replaces the subscriber watch-list and returns current status snapshot.
func (m *Manager) SetOnlineSubscriptions(subscriberUserID string, userSysIDs []string) (models.OnlineSubscriptionResultPayload, error) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()

	client, exists := m.clients[subscriberUserID]
	if !exists || !client.IsOnline {
		return models.OnlineSubscriptionResultPayload{}, ErrUserOffline
	}

	watchSet := make(map[string]struct{}, len(userSysIDs))
	for _, rawID := range userSysIDs {
		trimmed := strings.TrimSpace(rawID)
		if trimmed == "" {
			continue
		}
		watchSet[trimmed] = struct{}{}
	}

	client.OnlineWatchUserIDs = watchSet

	onlineUserIDs := m.getAllOnlineUserIDsLocked()
	onlineSet := make(map[string]bool, len(onlineUserIDs))
	for _, userID := range onlineUserIDs {
		onlineSet[userID] = true
	}

	subscribedUserIDs := make([]string, 0, len(watchSet))
	statuses := make(map[string]bool, len(watchSet))
	for userID := range watchSet {
		subscribedUserIDs = append(subscribedUserIDs, userID)
		statuses[userID] = onlineSet[userID]
	}

	sort.Strings(subscribedUserIDs)

	return models.OnlineSubscriptionResultPayload{
		SubscribedUserSysIDs: subscribedUserIDs,
		Statuses:             statuses,
		OnlineUserSysIDs:     onlineUserIDs,
	}, nil
}

// SendOnlineSubscriptionResult sends ONLINE_SUBSCRIPTION_RESULT to one subscriber.
func (m *Manager) SendOnlineSubscriptionResult(targetUserID string, payload models.OnlineSubscriptionResultPayload) error {
	response := map[string]interface{}{
		"type":    "ONLINE_SUBSCRIPTION_RESULT",
		"payload": payload,
	}

	return m.sendOnlineMessageToUser(targetUserID, response)
}

// BroadcastOnlinePresenceChanged notifies subscribers that a specific user's presence has changed.
func (m *Manager) BroadcastOnlinePresenceChanged(changedUserID string, isOnline bool) {
	payload := models.OnlinePresenceChangedPayload{
		UserSysID: changedUserID,
		IsOnline:  isOnline,
	}

	response := map[string]interface{}{
		"type":    "ONLINE_PRESENCE_CHANGED",
		"payload": payload,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal online presence changed message", "BroadcastOnlinePresenceChanged", err)
		return
	}

	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	for _, client := range m.clients {
		if !client.IsOnline {
			continue
		}

		if len(client.OnlineWatchUserIDs) == 0 {
			continue
		}

		if _, shouldNotify := client.OnlineWatchUserIDs[changedUserID]; !shouldNotify {
			continue
		}

		client.Mutex.Lock()
		err := client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
		client.Mutex.Unlock()

		if err != nil {
			logger.Error("Failed to send online presence changed to client "+client.UserID, "BroadcastOnlinePresenceChanged", err)
			go m.RemoveClient(client.UserID)
		}
	}
}

func (m *Manager) sendOnlineMessageToUser(targetUserID string, response map[string]interface{}) error {
	client, exists := m.GetClient(targetUserID)
	if !exists || !client.IsOnline {
		return ErrUserOffline
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		return err
	}

	client.Mutex.Lock()
	err = client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
	client.Mutex.Unlock()

	if err != nil {
		m.RemoveClient(targetUserID)
		return err
	}

	return nil
}

func (m *Manager) getAllOnlineUserIDsLocked() []string {
	userIDs := make([]string, 0)
	for _, client := range m.clients {
		if client.IsOnline {
			userIDs = append(userIDs, client.UserID)
		}
	}

	sort.Strings(userIDs)
	return userIDs
}
