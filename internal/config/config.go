package config

import (
	"os"

	"linklian-api/pkg/logger"

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
	RedisHost        string
	RedisPort        string
	RedisPassword    string
}

// Load loads environment variables and returns configuration
func Load() *Config {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		logger.Warn("No .env file found, using system environment variables", "config.Load")
	}

	return &Config{
		Port:             getEnv("PORT", "4800"),
		RabbitMQURL:      getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		Environment:      getEnv("GO_ENV", "development"),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		CORSOrigins:      getEnv("CORS_ORIGINS", "*"),
		RabbitMQOptional: getEnv("RABBITMQ_OPTIONAL", "true") == "true",
		RedisHost:        getEnv("REDIS_HOST", "localhost"),
		RedisPort:        getEnv("REDIS_PORT", "6379"),
		RedisPassword:    getEnv("REDIS_PASSWORD", ""),
	}
}

// getEnv gets environment variable with a default fallback
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
