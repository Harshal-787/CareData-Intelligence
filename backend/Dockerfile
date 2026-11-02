# Build Stage
FROM golang:alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy application source
COPY . .

# Build statically-linked production binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main ./cmd/api

# Run Stage
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 8080 2575

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

CMD ["./main"]
