package rabbitmq

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/rabbitmq/amqp091-go"

	// "linklian-api/internal/models"
)

// RabbitMQ Event types
const (
	EventChatMessage      = "chat.message"
	EventNotification     = "notification.send"
	EventUserJoinRoom     = "user.join_room"
	EventUserRegisterNoti = "user.register_noti"
	EventReadNotification = "notification.read"
)

// Manager handles RabbitMQ connections and operations
type Manager struct {
	conn    *amqp091.Connection
	channel *amqp091.Channel
}

// NewManager creates a new RabbitMQ manager
func NewManager(amqpURL string) (*Manager, error) {
	conn, err := amqp091.Dial(amqpURL)
	if err != nil {
		return nil, err
	}

	channel, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	manager := &Manager{
		conn:    conn,
		channel: channel,
	}

	// Initialize RabbitMQ resources
	if err := manager.declareResources(); err != nil {
		manager.Close()
		return nil, err
	}

	log.Println("✅ RabbitMQ connected successfully")
	return manager, nil
}

// Close closes RabbitMQ connections
func (m *Manager) Close() {
	if m.channel != nil {
		m.channel.Close()
	}
	if m.conn != nil {
		m.conn.Close()
	}
}

// declareResources declares exchanges, queues and bindings
func (m *Manager) declareResources() error {
	// Declare exchange
	err := m.channel.ExchangeDeclare(
		"linklian_events", // name
		"topic",           // type
		true,              // durable
		false,             // auto-deleted
		false,             // internal
		false,             // no-wait
		nil,               // arguments
	)
	if err != nil {
		return err
	}

	// Declare queues
	queues := []string{
		"chat_messages",
		"notifications",
		"user_activities",
	}

	for _, queueName := range queues {
		_, err = m.channel.QueueDeclare(
			queueName, // name
			true,      // durable
			false,     // delete when unused
			false,     // exclusive
			false,     // no-wait
			nil,       // arguments
		)
		if err != nil {
			return err
		}
	}

	// Bind queues to exchange
	bindings := map[string]string{
		"chat_messages":   "chat.*",
		"notifications":   "notification.*",
		"user_activities": "user.*",
	}

	for routingKey := range bindings {
		err = m.channel.QueueBind(
			"socket_events",             // queue name
			routingKey,        // routing key
			"linklian_events", // exchange
			false,
			nil,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// NewOptionalManager creates a new optional RabbitMQ manager that doesn't fail if connection fails
func NewOptionalManager(amqpURL string) *Manager {
	manager, err := NewManager(amqpURL)
	if err != nil {
		log.Printf("⚠️  RabbitMQ connection failed (running in offline mode): %v", err)
		return &Manager{} // Return empty manager
	}
	return manager
}

// PublishEvent publishes an event to RabbitMQ
func (m *Manager) PublishEvent(eventType string, data interface{}) error {
    // --- ส่วนที่แก้ไข: ลบ models.Event wrapper ออก ---
    // Worker เราต้องการ JSON หน้าตาแบบ {"type": "...", "payload": {...}}
    // ซึ่งตัวแปร data ที่ส่งเข้ามาเป็นแบบนั้นอยู่แล้ว จึงไม่ต้องห่อซ้ำ

    body, err := json.Marshal(data)
    if err != nil {
        return err
    }

    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // --- ส่วนที่แก้ไข: ชี้เป้าไปที่ Queue ของ Worker โดยตรง ---
    return m.channel.PublishWithContext(
        ctx,
        "",              // Exchange: ใส่ค่าว่างเพื่อใช้ Default Direct Exchange
        "socket_events", // Routing Key: **สำคัญมาก** ต้องตรงกับชื่อ Queue ใน Worker
        false,           // mandatory
        false,           // immediate
        amqp091.Publishing{
            ContentType: "application/json",
            Body:        body,
        },
    )
}

// SafePublishEvent publishes an event to RabbitMQ (safe version)
// ฟังก์ชันนี้เหมือนเดิมได้เลย
func (m *Manager) SafePublishEvent(eventType, userID string, data interface{}) {
    if m.channel == nil {
        log.Printf("📝 [OFFLINE] Would publish event %s for user %s: %v", eventType, userID, data)
        return
    }

    if err := m.PublishEvent(eventType, data); err != nil {
        log.Printf("❌ Failed to publish event %s: %v", eventType, err)
    }
}

// getCurrentTimestamp returns current unix timestamp
func getCurrentTimestamp() int64 {
	return getCurrentTime().Unix()
}
