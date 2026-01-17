# Go WebSocket Server with RabbitMQ
## LinkLian API - Go Version

This is a Go-based WebSocket server that replaces the original TypeScript/Node.js implementation. It uses RabbitMQ instead of PostgreSQL for event handling.

### Features

- **WebSocket Server**: Real-time communication support
- **Multi-feature Support**:
  - `JOIN_ROOM`: Join chat rooms
  - `REGISTER_NOTI`: Register for notifications
  - `CHAT_SEND`: Send chat messages
  - `READ_NOTI`: Mark notifications as read
- **RabbitMQ Integration**: All events are published to RabbitMQ for processing
- **Concurrent Client Management**: Thread-safe client handling

### Prerequisites

- Go 1.21 or higher
- RabbitMQ server
- Docker (optional, for RabbitMQ)

### Installation

1. **Install Go dependencies:**
```bash
go mod tidy
```

2. **Setup RabbitMQ:**

Using Docker:
```bash
docker run -d --hostname my-rabbit --name some-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Or install RabbitMQ directly on your system.

3. **Configure Environment Variables:**

Create a `.env` file in the root directory:
```env
PORT=4800
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
```

### Running the Server

```bash
# Development
go run ./cmd/

# Build and run
go build -o linklian-server ./cmd/
./linklian-server
```

### WebSocket API

#### Connection
Connect to: `ws://localhost:4800/ws`

#### Message Format
All messages should be in JSON format:
```json
{
  "type": "MESSAGE_TYPE",
  "payload": { ... }
}
```

#### Supported Message Types

##### 1. JOIN_ROOM
Join a chat room:
```json
{
  "type": "JOIN_ROOM",
  "payload": {
    "userID": "user123",
    "roomId": "ROOM_001"
  }
}
```

##### 2. REGISTER_NOTI
Register for notifications:
```json
{
  "type": "REGISTER_NOTI",
  "payload": {
    "userID": "user123"
  }
}
```

##### 3. CHAT_SEND
Send a chat message:
```json
{
  "type": "CHAT_SEND",
  "payload": {
    "roomId": "ROOM_001",
    "senderId": "USER_TEST",
    "message": "Hello RabbitMQ from Browser!"
  }
}
```

##### 4. READ_NOTI
Mark notification as read:
```json
{
  "type": "READ_NOTI",
  "payload": {
    "notificationID": "noti789"
  }
}
```

#### Server Responses

##### CHAT_RECEIVE
Broadcast to all clients in the same conversation:
```json
{
  "type": "CHAT_RECEIVE",
  "data": {
    "message_id": "uuid",
    "message_text": "Hello World!",
    "send_by": "user123",
    "conversation_id": "conv456",
    "send_at": 1642636800000
  }
}
```

##### NOTIFICATION
Sent to specific user:
```json
{
  "type": "NOTIFICATION",
  "data": {
    "title": "New Message",
    "content": "You have a new message",
    "timestamp": 1642636800
  }
}
```

### RabbitMQ Events

All events are published to the `linklian_events` exchange with the following routing keys:

- `chat.message` - Chat messages
- `notification.send` - Notifications
- `user.join_room` - User joins room
- `user.register_noti` - User registers for notifications  
- `notification.read` - Notification read events

### Health Check

Health endpoint: `GET http://localhost:4800/health`

Response:
```json
{
  "status": "healthy",
  "timestamp": 1642636800,
  "clients": 5
}
```

### Project Structure

```
.
├── cmd/                 # Application entrypoints
│   └── main.go         # Main application
├── internal/           # Private application code
│   ├── config/         # Configuration management
│   ├── handlers/       # HTTP and WebSocket handlers
│   ├── models/         # Data models and structures
│   ├── rabbitmq/       # RabbitMQ management
│   └── websocket/      # WebSocket management
├── pkg/                # Public packages
│   └── utils/          # Utility functions
├── examples/           # Example files
│   └── client.html     # WebSocket test client
├── go.mod              # Go module dependencies
├── .env                # Environment configuration
├── Dockerfile          # Docker build configuration
├── docker-compose.yml  # Docker Compose setup
├── Makefile           # Development commands
├── .air.toml          # Live reload configuration
└── README.md          # This file
```

### Differences from TypeScript Version

1. **Database**: Replaced PostgreSQL with RabbitMQ for event handling
2. **Language**: Migrated from TypeScript to Go for better performance
3. **Concurrency**: Native Go goroutines for handling multiple clients
4. **Event Publishing**: All events are published to RabbitMQ instead of direct database writes
5. **Message Queueing**: Support for offline message handling through RabbitMQ

### Development Notes

- **Modular Architecture**: Code is organized into separate packages for better maintainability
- **Concurrent Client Handling**: Native Go goroutines for handling multiple clients
- **Event Publishing**: All events are published to RabbitMQ instead of direct database writes
- **Message Queueing**: Support for offline message handling through RabbitMQ
- **Health Monitoring**: Built-in health checks for monitoring server status
- **Graceful Shutdown**: Proper cleanup of connections on server shutdown
- **CORS Support**: Enabled for development (adjust for production)

### API Endpoints

- `GET /health` - Health check endpoint
- `WS /ws` - WebSocket connection endpoint

### Security Considerations

For production deployment:
1. Configure proper CORS origins
2. Add authentication/authorization
3. Use secure WebSocket connections (WSS)
4. Implement rate limiting
5. Add input validation and sanitization