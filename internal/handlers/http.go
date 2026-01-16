package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"linklian-api/internal/models"
	wsmanager "linklian-api/internal/websocket"
)

// HTTPHandler handles HTTP requests
type HTTPHandler struct {
	wsManager *wsmanager.Manager
}

// NewHTTPHandler creates a new HTTP handler
func NewHTTPHandler(wsManager *wsmanager.Manager) *HTTPHandler {
	return &HTTPHandler{
		wsManager: wsManager,
	}
}

// HandleHealth handles health check requests
func (h *HTTPHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	response := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().Unix(),
		Clients:   h.wsManager.GetClientsCount(),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
