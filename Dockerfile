# Multi-stage build for Go application
FROM golang:1.21-alpine AS builder

# Install git and other dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/

# Final stage: minimal runtime image
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN adduser -D -s /bin/sh appuser

# Set working directory
WORKDIR /app

# Copy binary from builder stage to a location not overwritten by volumes
COPY --from=builder /app/main /usr/local/bin/linklian-socket

# Copy .env file if it exists (optional)
COPY --from=builder /app/.env* ./

# Change ownership to appuser and ensure binary is executable
RUN chown -R appuser:appuser /app && chmod +x /usr/local/bin/linklian-socket

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 4800

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4800/health || exit 1

# Run the binary
CMD ["linklian-socket"]