package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	"linklian-api/internal/models"
	"linklian-api/pkg/logger"
)

// Manager handles WebSocket connections and operations
// chatClients  — keyed by userID, tracks users in a chat room (/ws/chat)
// notiClients  — keyed by userID, tracks users registered for notifications (/ws/notification)
type Manager struct {
	chatClients  map[string]*models.ClientInfo
	notiClients  map[string]*models.ClientInfo
	clientsMutex sync.RWMutex
	upgrader     websocket.Upgrader
}

// NewManager creates a new WebSocket manager
func NewManager() *Manager {
	return &Manager{
		chatClients: make(map[string]*models.ClientInfo),
		notiClients: make(map[string]*models.ClientInfo),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

// AddChatClient registers a client in the chat room map
func (m *Manager) AddChatClient(client *models.ClientInfo) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	m.chatClients[client.UserID] = client
}

// RemoveChatClient removes a client from the chat room map
func (m *Manager) RemoveChatClient(userID string) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	delete(m.chatClients, userID)
}

// AddNotiClient registers a client in the notification map
func (m *Manager) AddNotiClient(client *models.ClientInfo) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	m.notiClients[client.UserID] = client
}

// RemoveNotiClient removes a client from the notification map
func (m *Manager) RemoveNotiClient(userID string) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	delete(m.notiClients, userID)
}

// GetNotiClient returns the noti client for a given userID
func (m *Manager) GetNotiClient(userID string) (*models.ClientInfo, bool) {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()
	client, exists := m.notiClients[userID]
	return client, exists
}

// GetClientsCount returns total connected clients across both maps
func (m *Manager) GetClientsCount() int {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()
	return len(m.chatClients) + len(m.notiClients)
}

// BroadcastToRoom broadcasts a message to all chat clients in a room
// BroadcastToRoom broadcasts a message to all chat clients in a room.
// Returns the list of userIDs that were in the room but failed to receive the message
// (stale connections) so the caller can fallback to notification.
func (m *Manager) BroadcastToRoom(chatId string, senderId string, messageType string, data interface{}) []string {
	response := map[string]interface{}{
		"type":    messageType,
		"payload": data,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal broadcast message", "BroadcastToRoom", err)
		return nil
	}

	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	var failed []string
	for _, client := range m.chatClients {
		if client.UserID == senderId {
			continue
		}
		if client.ChatId != nil && *client.ChatId == chatId && client.IsOnline {
			client.Mutex.Lock()
			err := client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
			client.Mutex.Unlock()

			if err != nil {
				logger.Error("Failed to send message to client "+client.UserID, "BroadcastToRoom", err)
				go m.RemoveChatClient(client.UserID)
				failed = append(failed, client.UserID)
			}
		}
	}
	return failed
}

// SendNotificationToUser sends a notification to a specific user via noti channel
func (m *Manager) SendNotificationToUser(targetUserID string, notiData interface{}) error {
	client, exists := m.GetNotiClient(targetUserID)

	if !exists || !client.IsOnline {
		return ErrUserOffline
	}

	response := map[string]interface{}{
		"type":    "NOTIFICATION",
		"payload": notiData,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("❌ Failed to marshal notification: %v", err)
		return err
	}

	client.Mutex.Lock()
	err = client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
	client.Mutex.Unlock()

	if err != nil {
		log.Printf("❌ Failed to send notification to user %s: %v", targetUserID, err)
		m.RemoveNotiClient(targetUserID)
		return err
	}

	log.Printf("🔔 Notification sent to user %s", targetUserID)
	return nil
}

// IsInChatRoom returns true if the user currently has an active chat connection
func (m *Manager) IsInChatRoom(userID string, chatId string) bool {
	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()
	client, exists := m.chatClients[userID]
	return exists && client.ChatId != nil && *client.ChatId == chatId
}

// UpgradeConnection upgrades HTTP connection to WebSocket
func (m *Manager) UpgradeConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return m.upgrader.Upgrade(w, r, nil)
}
