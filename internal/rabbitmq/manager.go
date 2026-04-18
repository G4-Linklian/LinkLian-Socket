package rabbitmq

import (
	"context"
	"encoding/json"
	"linklian-api/pkg/logger"
	"time"

	"github.com/rabbitmq/amqp091-go"
)

// exchangeName ต้องตรงกับ RABBITMQ_EXCHANGE ใน LinkLian-Core/src/worker/worker.constants.ts
const exchangeName = "linklian_events"

// RabbitMQ Event types (routing keys)
// ต้องตรงกับ RABBITMQ_ROUTING_KEY_* ใน LinkLian-Core/src/worker/worker.constants.ts
const (
	EventChatMessage      = "chat.message"
	EventNotification     = "notification.send"
	EventUserJoinRoom     = "user.join_room"
	EventUserRegisterNoti = "user.register_noti"
	EventReadNotification = "notification.read"
)

// Queue names — ต้องตรงกับ queue ที่ Core publish และ FCMConsumer consume
const (
	QueueChatEvents         = "chat_events"
	QueueNotificationEvents = "notification_events"
	QueueUserEvents         = "user_events"
)

// queueBindings defines queue-to-routing-key-pattern bindings
var queueBindings = map[string]string{
	QueueChatEvents:         "chat.*",
	QueueNotificationEvents: "notification.*",
	QueueUserEvents:         "user.*",
}

// EventHandler is a callback for processing consumed messages
type EventHandler func(body []byte) error

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

	logger.Log("RabbitMQ connected successfully", "NewManager")
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
	// Declare topic exchange
	err := m.channel.ExchangeDeclare(
		exchangeName, // name
		"topic",      // type
		true,         // durable
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil {
		return err
	}

	// Declare queues and bind to exchange
	for queue, routingKey := range queueBindings {
		_, err = m.channel.QueueDeclare(
			queue, // name
			true,  // durable
			false, // delete when unused
			false, // exclusive
			false, // no-wait
			nil,   // arguments
		)
		if err != nil {
			return err
		}

		err = m.channel.QueueBind(
			queue,        // queue name
			routingKey,   // routing key pattern
			exchangeName, // exchange
			false,
			nil,
		)
		if err != nil {
			return err
		}

		logger.Log("Queue declared and bound", "declareResources", map[string]interface{}{
			"queue":       queue,
			"routing_key": routingKey,
		})
	}

	return nil
}

// NewOptionalManager creates a new optional RabbitMQ manager that doesn't fail if connection fails
func NewOptionalManager(amqpURL string) *Manager {
	manager, err := NewManager(amqpURL)
	if err != nil {
		logger.Warn("RabbitMQ connection failed (running in offline mode)", "NewOptionalManager", err)
		return &Manager{} // Return empty manager
	}
	return manager
}

// PublishEvent publishes an event to the topic exchange with the given routing key
func (m *Manager) PublishEvent(eventType string, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Publish to topic exchange; messages are routed to queues by routing key pattern
	return m.channel.PublishWithContext(
		ctx,
		exchangeName, // exchange
		eventType,    // routing key (e.g. "chat.message")
		false,        // mandatory
		false,        // immediate
		amqp091.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

// SafePublishEvent publishes an event to RabbitMQ (safe version)
func (m *Manager) SafePublishEvent(eventType, userID string, data interface{}) {
	if m.channel == nil {
		logger.Log(" Would publish event "+eventType+" for user "+userID+": ", "SafePublishEvent", data)
		return
	}

	if err := m.PublishEvent(eventType, data); err != nil {
		logger.Error("Failed to publish event "+eventType, "SafePublishEvent", err)
	}
}

// StartConsumer starts consuming messages from the specified queue.
// It runs in a blocking loop — call this in a goroutine.
func (m *Manager) StartConsumer(queue string, handler EventHandler) {
	if m.channel == nil {
		logger.Warn("RabbitMQ channel is nil, skipping consumer for "+queue, "StartConsumer")
		return
	}

	// Fair dispatch — 1 message at a time per consumer
	if err := m.channel.Qos(1, 0, false); err != nil {
		logger.Error("Failed to set QoS for "+queue, "StartConsumer", err)
		return
	}

	msgs, err := m.channel.Consume(
		queue, // queue
		"",    // consumer tag (auto-generated)
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		logger.Error("Failed to start consumer for "+queue, "StartConsumer", err)
		return
	}

	logger.Log("Consumer started for queue: "+queue, "StartConsumer")

	for d := range msgs {
		if err := handler(d.Body); err != nil {
			logger.Error("Error processing message from "+queue, "StartConsumer", err)
			// Ack anyway to avoid stuck messages; change to Nack+requeue if retry is needed
			d.Ack(false)
		} else {
			d.Ack(false)
		}
	}

	logger.Warn("Consumer channel closed for queue: "+queue, "StartConsumer")
}

// getCurrentTimestamp returns current unix timestamp
func getCurrentTimestamp() int64 {
	return getCurrentTime().Unix()
}
