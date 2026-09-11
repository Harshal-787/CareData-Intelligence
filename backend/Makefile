.PHONY: swagger run build test

# Generate Swagger OpenAPI docs from Go annotations
swagger:
	@echo "Generating Swagger documentation from code annotations..."
	@swag init -g cmd/api/main.go -o docs
	@echo "✓ Swagger documentation updated in backend/docs/"

# Run the API server locally
run:
	@go run cmd/api/main.go

# Build the production binary
build:
	@go build -o bin/caredata-api cmd/api/main.go

# Run unit tests
test:
	@go test -v ./...
