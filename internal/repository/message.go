package repository

import "log"

// MessageRepository defines the interface for message-related data operations
type MessageRepository interface {
	MarkDelivered(messageID string) error
}

// StubMessageRepository is a placeholder implementation that logs actions
// Replace this with a real database repository (e.g., PostgreSQL, MongoDB)
type StubMessageRepository struct{}

// NewStubMessageRepository creates a new stub repository
func NewStubMessageRepository() *StubMessageRepository {
	return &StubMessageRepository{}
}

// MarkDelivered marks a message as delivered
func (r *StubMessageRepository) MarkDelivered(messageID string) error {
	log.Printf("📝 [REPO] MarkDelivered called for messageID: %s (Stub implementation)", messageID)
	// Output: Simulate DB update
	return nil
}
