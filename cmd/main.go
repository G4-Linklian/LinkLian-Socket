package main

import (
	"context"
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
	"github.com/redis/go-redis/v9"
)

// Server represents the main server instance
type Server struct {
	config        *config.Config
	wsManager     *wsmanager.Manager
	onlineManager *wsmanager.Manager
	rabbitManager *rabbitmq.Manager
	wsHandler     *handlers.WebSocketHandler
	onlineHandler *handlers.OnlineStatusHandler
	notiHandler   *handlers.NotificationHandler
	httpHandler   *handlers.HTTPHandler
	redisClient   *redis.Client
}

// NewServer creates a new server instance
func NewServer() (*Server, error) {
	// Load configuration
	cfg := config.Load()

	redisAddr := cfg.RedisHost + ":" + cfg.RedisPort

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	var wsManager *wsmanager.Manager

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		logger.Warn("Redis connection failed, running without cache", "NewServer", err)
		wsManager = wsmanager.NewManager()
	} else {
		logger.Log("Redis connected successfully!", "NewServer")
		wsManager = wsmanager.NewManagerWithRedis(rdb)
	}

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
	onlineManager := wsmanager.NewManager()
	onlineHandler := handlers.NewOnlineStatusHandler(onlineManager)
	notiHandler := handlers.NewNotificationHandler(wsManager)
	httpHandler := handlers.NewHTTPHandler(wsManager)

	return &Server{
		config:        cfg,
		wsManager:     wsManager,
		onlineManager: onlineManager,
		rabbitManager: rabbitManager,
		wsHandler:     wsHandler,
		onlineHandler: onlineHandler,
		notiHandler:   notiHandler,
		httpHandler:   httpHandler,
		redisClient:   rdb,
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
	// Start consuming from qa_events queue
	s.startQAConsumer()

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

// startQAConsumer starts consuming from the qa_events queue
func (s *Server) startQAConsumer() {
	go s.rabbitManager.StartConsumer(rabbitmq.QueueQAEvents, func(body []byte) error {
		var event models.Message
		if err := json.Unmarshal(body, &event); err != nil {
			logger.Error("Failed to parse message from qa_events", "startQAConsumer", err)
			return err
		}

		switch event.Type {
		case
			"QA_LIVE_STARTED",
			"QA_LIVE_ENDED",
			"FILE_CHANGED",
			"QA_NEW_QUESTION",
			"QA_QUESTION_UPDATED",
			"QA_UPVOTED":

			logger.Debug("Received QA Event from queue: "+event.Type, "startQAConsumer", event)
			s.wsHandler.HandleQAEvent(event)

		default:
			logger.Warn("Unknown event type from qa_events: "+event.Type, "startQAConsumer")
		}
		return nil
	})
}

// setupRoutes sets up HTTP routes
func (s *Server) setupRoutes() {
	http.HandleFunc("/ws/chat", s.handleChatConnection)
	http.HandleFunc("/ws/noti", s.handleNotiConnection)
	http.HandleFunc("/ws/qa", s.handleQAConnection)
	http.HandleFunc("/ws/online", s.handleOnlineConnection)
	http.HandleFunc("/health", s.httpHandler.HandleHealth)
}

// setupGracefulShutdown sets up graceful shutdown
func (s *Server) setupGracefulShutdown() {
	utils.GracefulShutdown(func() {
		if s.rabbitManager != nil {
			s.rabbitManager.Close()
		}

		if s.redisClient != nil {
			err := s.redisClient.Close()
			if err != nil {
				logger.Error("Failed to close Redis connection", "GracefulShutdown", err)
			} else {
				logger.Log("Redis connection closed successfully", "GracefulShutdown")
			}
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
		} else {
			logger.Warn("ClientInfo is nil during defer cleanup in handleChatConnection", "handleChatConnection")
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

		case "JOIN_WAITING":
			logger.Debug("JOIN_WAITING message received", "handleChatConnection", msg)
			clientInfo = s.wsHandler.HandleJoinWaiting(conn, msg.Payload, clientInfo)

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

// handleOnlineConnection handles standalone online status WebSocket connections (/ws/online)
func (s *Server) handleOnlineConnection(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Online Status WebSocket connecting", "handleOnlineConnection")

	conn, err := s.onlineManager.UpgradeConnection(w, r)
	if err != nil {
		logger.Error("WebSocket upgrade error", "handleOnlineConnection", err)
		return
	}

	var clientInfo *models.ClientInfo

	defer func() {
		if clientInfo != nil {
			disconnectedUserID := clientInfo.UserID
			s.onlineManager.RemoveClient(disconnectedUserID)
			s.onlineManager.BroadcastOnlinePresenceChanged(disconnectedUserID, false)
		}

		if err := conn.Close(); err != nil {
			logger.Warn("Failed to close online socket connection", "handleOnlineConnection", err)
		}
	}()

	for {
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				logger.Error("Online WebSocket unexpected close", "handleOnlineConnection", err)
			} else {
				logger.Log("Online WebSocket disconnected", "handleOnlineConnection")
			}
			break
		}

		var msg models.Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			logger.Error("JSON parse error", "handleOnlineConnection", err)
			continue
		}

		switch msg.Type {
		case "JOIN_ONLINE":
			logger.Debug("Received JOIN_ONLINE message", "handleOnlineConnection", msg)
			clientInfo = s.onlineHandler.HandleJoinOnline(conn, msg.Payload)

		case "LEAVE_ONLINE":
			s.onlineHandler.HandleLeaveOnline(clientInfo, msg.Payload)
			clientInfo = nil

		case "ONLINE_SUBSCRIBE":
			s.onlineHandler.HandleOnlineSubscribe(clientInfo, msg.Payload)

		case "ONLINE_STATUS_CHECK":
			s.onlineHandler.HandleOnlineStatusCheck(clientInfo, msg.Payload)

		default:
			logger.Warn("Unknown online message type: "+msg.Type, "handleOnlineConnection")
		}
	}
}

// handleQAConnection handles WebSocket connections for Q&A (/ws/qa)
func (s *Server) handleQAConnection(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Q&A WebSocket connecting", "handleQAConnection")

	conn, err := s.wsManager.UpgradeConnection(w, r)
	if err != nil {
		logger.Error("WebSocket upgrade error", "handleQAConnection", err)
		return
	}

	var clientInfo *models.ClientInfo

	defer func() {
		if clientInfo != nil {
			s.wsManager.RemoveClient(clientInfo.UserID)
		}

		if err := conn.Close(); err != nil {
			logger.Warn("Failed to close connection", "WebSocket", err)
		}
	}()

	for {
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				logger.Error("Q&A WebSocket unexpected close", "handleQAConnection", err)
			} else {
				logger.Log("Q&A WebSocket disconnected", "handleQAConnection")
			}
			break
		}

		var msg models.Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			logger.Error("JSON parse error", "handleQAConnection", err)
			continue
		}

		switch msg.Type {
		case "JOIN_LIVE":
			clientInfo = s.wsHandler.HandleJoinLive(conn, msg.Payload)

		case "JOIN_SECTION_ROOM":
			s.wsHandler.HandleJoinSectionRoom(conn, msg.Payload)

		case "SLIDE_SYNC":
			s.wsHandler.HandleSlideSync(conn, msg.Payload)

		case "QA_LIVE_STARTED", "QA_LIVE_ENDED", "FILE_CHANGED", "QA_NEW_QUESTION", "QA_QUESTION_UPDATED", "QA_UPVOTED":
			logger.Debug("Received QA Event from Worker via WebSocket: "+msg.Type, "handleQAConnection", msg)
			s.wsHandler.HandleQAEvent(msg)

		default:
			logger.Warn("Unknown Q&A message type: "+msg.Type, "handleQAConnection")
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
		} else {
			logger.Warn("ClientInfo is nil during defer cleanup in handleNotiConnection", "handleNotiConnection")
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
			clientInfo = s.notiHandler.HandleRegister(conn, msg.Payload, clientInfo)

		case "SEND_NOTIFICATION":
			logger.Log("Received SEND_NOTIFICATION message", "handleNotiConnection", msg)
			s.notiHandler.HandleSendNoti(clientInfo, msg.Payload)

		case "READ_NOTI":
			s.notiHandler.HandleRead(clientInfo, msg.Payload)
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
