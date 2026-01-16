package utils

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

// GracefulShutdown waits for interrupt signal and calls cleanup function
func GracefulShutdown(cleanup func()) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	sig := <-c
	log.Printf("🔄 Received signal %s, shutting down gracefully...", sig)

	if cleanup != nil {
		cleanup()
	}

	log.Println("✅ Shutdown completed")
	os.Exit(0)
}

// LogInfo logs info message with emoji
func LogInfo(message string) {
	log.Printf("ℹ️  %s", message)
}

// LogError logs error message with emoji
func LogError(message string, err error) {
	if err != nil {
		log.Printf("❌ %s: %v", message, err)
	} else {
		log.Printf("❌ %s", message)
	}
}

// LogSuccess logs success message with emoji
func LogSuccess(message string) {
	log.Printf("✅ %s", message)
}

// LogWarning logs warning message with emoji
func LogWarning(message string) {
	log.Printf("⚠️  %s", message)
}
