# Development Scripts and Commands

# Initialize Go modules and download dependencies
go-init:
	go mod init linklian-api
	go mod tidy

# Run the server in development mode
dev:
	go run ./cmd/

# Build the server
build:
	go build -o linklian-server ./cmd/

# Build for production (optimized)
build-prod:
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w -s' -o linklian-server ./cmd/

# Run with live reload (requires 'air' tool)
dev-watch:
	air

# Install air for live reload
install-air:
	go install github.com/cosmtrek/air@latest

# Test the server
test:
	go test ./...

# Start RabbitMQ with Docker
rabbitmq-start:
	docker run -d --name linklian-rabbitmq \
		--hostname rabbitmq-server \
		-p 5672:5672 \
		-p 15672:15672 \
		-e RABBITMQ_DEFAULT_USER=linklian \
		-e RABBITMQ_DEFAULT_PASS=linklian123 \
		rabbitmq:3-management

# Stop RabbitMQ
rabbitmq-stop:
	docker stop linklian-rabbitmq
	docker rm linklian-rabbitmq

# Start with Docker Compose
docker-up:
	docker-compose up --build

# Stop Docker Compose
docker-down:
	docker-compose down

# Clean up Docker
docker-clean:
	docker-compose down
	docker system prune -f

# Create .env from example
env-setup:
	cp .env.example .env

# Install Go dependencies
deps:
	go mod download
	go mod tidy

# Format Go code
fmt:
	go fmt ./...

# Vet Go code
vet:
	go vet ./...

# Run linter (requires golangci-lint)
lint:
	golangci-lint run

# Install linter
install-lint:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Full check (format, vet, lint, test)
check: fmt vet lint test

# Clean build artifacts
clean:
	rm -f linklian-server
	go clean

# Show help
help:
	@echo "Available commands:"
	@echo "  go-init         - Initialize Go modules"
	@echo "  dev             - Run server in development mode"
	@echo "  build           - Build the server"
	@echo "  build-prod      - Build for production"
	@echo "  dev-watch       - Run with live reload (requires air)"
	@echo "  install-air     - Install air tool for live reload"
	@echo "  test            - Run tests"
	@echo "  rabbitmq-start  - Start RabbitMQ with Docker"
	@echo "  rabbitmq-stop   - Stop RabbitMQ"
	@echo "  docker-up       - Start with Docker Compose"
	@echo "  docker-down     - Stop Docker Compose"
	@echo "  docker-clean    - Clean Docker resources"
	@echo "  env-setup       - Create .env from example"
	@echo "  deps            - Install Go dependencies"
	@echo "  fmt             - Format Go code"
	@echo "  vet             - Vet Go code"
	@echo "  lint            - Run linter"
	@echo "  install-lint    - Install linter"
	@echo "  check           - Full check (format, vet, lint, test)"
	@echo "  clean           - Clean build artifacts"
	@echo "  help            - Show this help"

.PHONY: go-init dev build build-prod dev-watch install-air test rabbitmq-start rabbitmq-stop docker-up docker-down docker-clean env-setup deps fmt vet lint install-lint check clean help