package websocket

import "errors"

var (
	// ErrUserOffline is returned when user is not online
	ErrUserOffline = errors.New("user is offline")

	// ErrInvalidPayload is returned when payload is invalid
	ErrInvalidPayload = errors.New("invalid payload")

	// ErrClientNotFound is returned when client is not found
	ErrClientNotFound = errors.New("client not found")
)
