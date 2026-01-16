package rabbitmq

import "time"

// getCurrentTime returns current time
// This function is separated for easier testing
func getCurrentTime() time.Time {
	return time.Now()
}
