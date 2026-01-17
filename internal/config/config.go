package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Port             string
	RabbitMQURL      string
	Environment      string
	LogLevel         string
	CORSOrigins      string
	RabbitMQOptional bool
}

// Load loads environment variables and returns configuration
func Load() *Config {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	return &Config{
		Port:             getEnv("PORT", "4800"),
		RabbitMQURL:      getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		Environment:      getEnv("GO_ENV", "development"),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		CORSOrigins:      getEnv("CORS_ORIGINS", "*"),
		RabbitMQOptional: getEnv("RABBITMQ_OPTIONAL", "true") == "true",
	}
}

// getEnv gets environment variable with a default fallback
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
