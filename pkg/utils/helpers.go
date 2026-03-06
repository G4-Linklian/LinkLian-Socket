package utils

import (
	"os"
	"os/signal"
	"syscall"
	"linklian-api/pkg/logger"
)

// GracefulShutdown waits for interrupt signal and calls cleanup function
func GracefulShutdown(cleanup func()) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	sig := <-c
	logger.Log("Received signal "+sig.String()+", shutting down gracefully...", "GracefulShutdown")

	if cleanup != nil {
		cleanup()
	}

	logger.Log("Shutdown completed", "GracefulShutdown")
	os.Exit(0)
}