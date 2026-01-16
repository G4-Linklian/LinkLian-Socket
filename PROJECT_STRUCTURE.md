# LinkLian API - Go Project Structure

โปรเจคนี้ได้ถูกจัดระเบียบให้เป็น folder structure ที่เป็นมาตรฐานของ Go แล้ว

## 📁 โครงสร้างใหม่:

```
LinkLian-API/
├── cmd/                    # Application entry points
│   └── main.go            # Main application
├── internal/              # Private application packages (ไม่สามารถ import จากโปรเจคอื่นได้)
│   ├── config/           # Configuration management
│   │   └── config.go
│   ├── handlers/         # HTTP & WebSocket handlers
│   │   ├── http.go       # HTTP handlers
│   │   └── websocket.go  # WebSocket handlers
│   ├── models/           # Data structures & types
│   │   └── types.go
│   ├── rabbitmq/         # RabbitMQ management
│   │   ├── manager.go    # RabbitMQ connection & operations
│   │   └── utils.go      # RabbitMQ utilities
│   └── websocket/        # WebSocket management
│       ├── manager.go    # WebSocket client management
│       └── errors.go     # WebSocket related errors
├── pkg/                   # Public packages (สามารถ import จากโปรเจคอื่นได้)
│   └── utils/
│       └── helpers.go    # Utility functions
├── examples/              # Example files
│   └── client.html       # WebSocket test client
├── go.mod                 # Go module dependencies
├── go.sum                 # Dependency checksums
├── .env.example          # Environment variables template
├── .air.toml             # Live reload configuration
├── Makefile              # Build & development commands
├── Dockerfile            # Docker build configuration
├── docker-compose.yml    # Docker Compose setup
└── README.md            # Documentation
```

## 🚀 วิธีรัน:

### 1. Development (โดยไม่ต้อง build):
```bash
go run ./cmd/
```

### 2. Build แล้วรัน:
```bash
go build -o linklian-server ./cmd/
./linklian-server
```

### 3. ใช้ Makefile:
```bash
# Run development server
make dev

# Build application
make build

# Setup environment
make env-setup

# Start RabbitMQ with Docker
make rabbitmq-start

# Run with Docker Compose
make docker-up
```

### 4. ใช้ Live Reload (ต้อง install air ก่อน):
```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with live reload
air
```

## 📋 ส่วนประกอบหลัก:

### 1. **cmd/main.go** 
- Entry point ของ application
- สร้าง server instance และ start HTTP server

### 2. **internal/config/config.go**
- จัดการ environment variables
- กำหนดค่าต่างๆ ของ application

### 3. **internal/models/types.go**
- กำหนด struct สำหรับ data models
- ClientInfo, Message, ChatMessage, etc.

### 4. **internal/rabbitmq/manager.go**
- จัดการ RabbitMQ connection
- Publish events ไป RabbitMQ

### 5. **internal/websocket/manager.go**
- จัดการ WebSocket connections
- Client management (add, remove, broadcast)

### 6. **internal/handlers/**
- **websocket.go**: จัดการ WebSocket messages (JOIN_ROOM, CHAT_SEND, etc.)
- **http.go**: จัดการ HTTP requests (health check)

### 7. **pkg/utils/helpers.go**
- Utility functions ที่สามารถใช้ได้ทั่วไป
- Graceful shutdown, logging helpers

## 🔄 การทำงาน:

1. **main.go** สร้าง Server instance
2. **Server** load config และ initialize managers (WebSocket, RabbitMQ)
3. **Server** setup HTTP routes และ handlers
4. **WebSocket Handler** จัดการ WebSocket messages และ publish ไป RabbitMQ
5. **WebSocket Manager** จัดการ client connections และ broadcasting
6. **RabbitMQ Manager** จัดการ event publishing

## 🎯 ข้อดีของโครงสร้างใหม่:

### ✅ **Separation of Concerns**
- แต่ละ package มีหน้าที่ที่ชัดเจน
- ง่ายต่อการ maintain และ debug

### ✅ **Testability**
- แต่ละ component แยกออกจากกัน
- สามารถทำ unit test ได้ง่าย

### ✅ **Scalability**
- เพิ่ม feature ใหม่ได้ง่าย
- ขยาย codebase ได้โดยไม่ซับซ้อน

### ✅ **Go Best Practices**
- ใช้ `internal/` สำหรับ private packages
- ใช้ `pkg/` สำหรับ public packages
- ใช้ `cmd/` สำหรับ application entry points

### ✅ **Dependency Management**
- ลดการ coupling ระหว่าง modules
- ใช้ interfaces สำหรับ dependency injection

## 🔧 Environment Setup:

สร้างไฟล์ `.env`:
```env
PORT=7070
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
GO_ENV=development
LOG_LEVEL=info
CORS_ORIGINS=*
```

## 🐳 Docker:

```bash
# Start with Docker Compose (RabbitMQ + API)
docker-compose up --build

# หรือ RabbitMQ อย่างเดียว
docker run -d --name linklian-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

## 📊 Monitoring:

- **Health Check**: `GET http://localhost:7070/health`
- **RabbitMQ Management**: `http://localhost:15672` (guest:guest)
- **WebSocket Endpoint**: `ws://localhost:7070/ws`

ตอนนี้โปรเจคมีโครงสร้างที่เป็นระเบียบและง่ายต่อการพัฒนาต่อยอดแล้วครับ! 🎉