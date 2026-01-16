package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	"linklian-api/internal/models"
)

// Manager handles WebSocket connections and operations
type Manager struct {
	clients      map[string]*models.ClientInfo
	clientsMutex sync.RWMutex
	upgrader     websocket.Upgrader
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

// AddClient adds a client to the manager
func (m *Manager) AddClient(client *models.ClientInfo) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	m.clients[client.UserID] = client
}

// RemoveClient removes a client from the manager
func (m *Manager) RemoveClient(userID string) {
	m.clientsMutex.Lock()
	defer m.clientsMutex.Unlock()
	delete(m.clients, userID)
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
func (m *Manager) BroadcastToRoom(roomId string, messageType string, data interface{}) {
	response := map[string]interface{}{
		"type": messageType,
		"payload": data,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("❌ Failed to marshal broadcast message: %v", err)
		return
	}

	m.clientsMutex.RLock()
	defer m.clientsMutex.RUnlock()

	for _, client := range m.clients {
		if client.RoomId != nil && *client.RoomId == roomId && client.IsOnline {
			client.Mutex.Lock()
			err := client.Socket.WriteMessage(websocket.TextMessage, responseBytes)
			client.Mutex.Unlock()

			if err != nil {
				log.Printf("❌ Failed to send message to client %s: %v", client.UserID, err)
				// Remove client on write error
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
		"type": "NOTIFICATION",
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
		m.RemoveClient(targetUserID)
		return err
	}

	log.Printf("🔔 Notification sent to user %s", targetUserID)
	return nil
}

// UpgradeConnection upgrades HTTP connection to WebSocket
func (m *Manager) UpgradeConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return m.upgrader.Upgrade(w, r, nil)
}
