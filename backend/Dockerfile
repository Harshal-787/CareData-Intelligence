# Build Stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build the backend application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

# Run Stage
FROM alpine:3.18
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
