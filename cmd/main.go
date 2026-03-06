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
	"linklian-api/pkg/logger"
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
		logger.Log("RabbitMQURL", "NewServer", cfg.RabbitMQURL)
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

	// Start consuming from chat_events queue
	s.startChatConsumer()

	// Start server
	logger.Log("Go WebSocket Server is running on port "+s.config.Port, "Server.Start")
	return http.ListenAndServe(":"+s.config.Port, nil)
}

// startChatConsumer starts consuming from the chat_events queue
func (s *Server) startChatConsumer() {
	go s.rabbitManager.StartConsumer(rabbitmq.QueueChatEvents, func(body []byte) error {
		var event models.Message
		if err := json.Unmarshal(body, &event); err != nil {
			logger.Error("Failed to parse message from chat_events", "startChatConsumer", err)
			return err
		}

		switch event.Type {
		case "CHAT_DELIVER":
			logger.Debug("Received CHAT_DELIVER from queue", "startChatConsumer", event)
			s.wsHandler.HandleChatDeliver(event.Payload)
		default:
			logger.Warn("Unknown event type from chat_events: "+event.Type, "startChatConsumer")
		}

		return nil
	})
}

// setupRoutes sets up HTTP routes
func (s *Server) setupRoutes() {
	http.HandleFunc("/ws/chat", s.handleChatConnection)
	http.HandleFunc("/ws/noti", s.handleNotiConnection)
	http.HandleFunc("/health", s.httpHandler.HandleHealth)
}

// setupGracefulShutdown sets up graceful shutdown
func (s *Server) setupGracefulShutdown() {
	utils.GracefulShutdown(func() {
		if s.rabbitManager != nil {
			s.rabbitManager.Close()
		}
	})
}

// handleChatConnection handles WebSocket connections for chat (/ws/chat)
func (s *Server) handleChatConnection(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Chat WebSocket connecting", "handleChatConnection")

	conn, err := s.wsManager.UpgradeConnection(w, r)
	if err != nil {
		logger.Error("WebSocket upgrade error", "handleChatConnection", err)
		return
	}

	var clientInfo *models.ClientInfo

	defer func() {
		if clientInfo != nil {
			s.wsManager.RemoveClient(clientInfo.UserID)
		}
		conn.Close()
	}()

	for {
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("Chat WebSocket unexpected close", "handleChatConnection", err)
			} else {
				logger.Log("Chat WebSocket closed", "handleChatConnection")
			}
			break
		}

		var msg models.Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			logger.Error("JSON parse error", "handleChatConnection", err)
			continue
		}

		switch msg.Type {
		case "JOIN_ROOM":
			clientInfo = s.wsHandler.HandleJoinRoom(conn, msg.Payload)
		case "CHAT_SEND":
			if clientInfo != nil {
				s.wsHandler.HandleChatSend(clientInfo, msg.Payload)
			}
		case "CHAT_DELIVER":
			logger.Debug("Received CHAT_DELIVER from queue", "handleChatConnection")
			s.wsHandler.HandleChatDeliver(msg.Payload)
		default:
			logger.Warn("Unknown chat message type: "+msg.Type, "handleChatConnection")
		}
	}
}

// handleNotiConnection handles WebSocket connections for notifications (/ws/noti)
func (s *Server) handleNotiConnection(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Noti WebSocket connecting", "handleNotiConnection")

	conn, err := s.wsManager.UpgradeConnection(w, r)
	if err != nil {
		logger.Error("WebSocket upgrade error", "handleNotiConnection", err)
		return
	}

	var clientInfo *models.ClientInfo

	defer func() {
		if clientInfo != nil {
			s.wsManager.RemoveClient(clientInfo.UserID)
		}
		conn.Close()
	}()

	for {
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("Noti WebSocket unexpected close", "handleNotiConnection", err)
			} else {
				logger.Log("Noti WebSocket closed", "handleNotiConnection")
			}
			break
		}

		var msg models.Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			logger.Error("JSON parse error", "handleNotiConnection", err)
			continue
		}

		switch msg.Type {
		case "REGISTER_NOTI":
			
		case "READ_NOTI":

		default:
			logger.Warn("Unknown noti message type: "+msg.Type, "handleNotiConnection")
		}
	}
}

func main() {
	server, err := NewServer()
	if err != nil {
		logger.Error("Failed to create server", "main", err)
		log.Fatalf(" Failed to create server: %v", err)
	}

	if err := server.Start(); err != nil {
		logger.Error("Failed to start server", "main", err)
		log.Fatalf("Failed to start server: %v", err)
	}
}
