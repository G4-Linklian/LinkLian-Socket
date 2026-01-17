package main

import (
	"encoding/json"
	"log"
	"net/http"

	"linklian-api/internal/config"
	"linklian-api/internal/handlers"
	"linklian-api/internal/models"
	"linklian-api/internal/rabbitmq"
	"linklian-api/internal/repository"
	wsmanager "linklian-api/internal/websocket"
	"linklian-api/pkg/utils"
	"github.com/gorilla/websocket"
)

// Server represents the main server instance
type Server struct {
	config        *config.Config
	wsManager     *wsmanager.Manager
	rabbitManager *rabbitmq.Manager
	wsHandler     *handlers.WebSocketHandler
	httpHandler   *handlers.HTTPHandler
}

// NewServer creates a new server instance
func NewServer() (*Server, error) {
	// Load configuration
	cfg := config.Load()

	// Initialize WebSocket manager
	wsManager := wsmanager.NewManager()

	// Initialize RabbitMQ manager (optional)
	var rabbitManager *rabbitmq.Manager
	if cfg.RabbitMQOptional {
		log.Println("⚠️ RabbitMQURL", cfg.RabbitMQURL)
		rabbitManager = rabbitmq.NewOptionalManager(cfg.RabbitMQURL)
	} else {
		var err error
		rabbitManager, err = rabbitmq.NewManager(cfg.RabbitMQURL)
		if err != nil {
			return nil, err
		}
	}

	// Initialize repositories
	messageRepo := repository.NewStubMessageRepository()

	// Initialize handlers
	wsHandler := handlers.NewWebSocketHandler(wsManager, rabbitManager, messageRepo)
	httpHandler := handlers.NewHTTPHandler(wsManager)

	return &Server{
		config:        cfg,
		wsManager:     wsManager,
		rabbitManager: rabbitManager,
		wsHandler:     wsHandler,
		httpHandler:   httpHandler,
	}, nil
}

// Start starts the server
func (s *Server) Start() error {
	// Setup routes
	s.setupRoutes()

	// Setup graceful shutdown
	go s.setupGracefulShutdown()

	// Start server
	utils.LogSuccess("Go WebSocket Server is running on port " + s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, nil)
}

// setupRoutes sets up HTTP routes
func (s *Server) setupRoutes() {
	http.HandleFunc("/ws", s.handleWebSocketConnection)
	http.HandleFunc("/health", s.httpHandler.HandleHealth)
	http.HandleFunc("/ws/internal", s.handleInternalConnection)
}

// setupGracefulShutdown sets up graceful shutdown
func (s *Server) setupGracefulShutdown() {
	utils.GracefulShutdown(func() {
		if s.rabbitManager != nil {
			s.rabbitManager.Close()
		}
	})
}

// handleWebSocketConnection handles WebSocket connections
func (s *Server) handleWebSocketConnection(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := s.wsManager.UpgradeConnection(w, r)
	if err != nil {
		utils.LogError("WebSocket upgrade error", err)
		return
	}

	var clientInfo *models.ClientInfo

	defer func() {
		// Cleanup on disconnect
		if clientInfo != nil {
			s.wsManager.RemoveClient(clientInfo.UserID)
		}
		conn.Close()
	}()

	for {
		// Read message from WebSocket
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			utils.LogError("WebSocket read error", err)
			break
		}

		var msg models.Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			utils.LogError("JSON parse error", err)
			continue
		}

		// Handle different message types
		switch msg.Type {
		case "JOIN_ROOM":
			clientInfo = s.wsHandler.HandleJoinRoom(conn, msg.Payload)
		case "REGISTER_NOTI":
			clientInfo = s.wsHandler.HandleRegisterNoti(conn, msg.Payload)
		case "CHAT_SEND":
			if clientInfo != nil {
				s.wsHandler.HandleChatSend(clientInfo, msg.Payload)
			}
		case "READ_NOTI":
			if clientInfo != nil {
				s.wsHandler.HandleReadNoti(clientInfo, msg.Payload)
			}
		default:
			utils.LogWarning("Unknown message type: " + msg.Type)
		}
	}
}

func (s *Server) handleInternalConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := s.wsManager.UpgradeConnection(w, r)

	if err != nil {
		utils.LogError("WebSocket upgrade error", err)
		return
	}
	defer conn.Close()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
			) {
				utils.LogError("Internal WebSocket unexpected close", err)
			} else {
				utils.LogInfo("Internal WebSocket closed normally")
			}
			break
		}

		var event models.Message
		if err := json.Unmarshal(msg, &event); err != nil {
			utils.LogError("Internal JSON parse error", err)
			continue
		}

		switch event.Type {
		case "CHAT_DELIVER":
			s.wsHandler.HandleChatDeliver(event.Payload)
		default:
			utils.LogWarning("Unknown internal message type: " + event.Type)
		}
	}
}

func main() {
	server, err := NewServer()
	if err != nil {
		log.Fatalf("❌ Failed to create server: %v", err)
	}

	if err := server.Start(); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
