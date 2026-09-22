#!/bin/bash
set -e

echo "Running Database Migrations..."

# Wait for Postgres to be ready
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "postgres" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing migrations"

# Note: The Go application backend currently handles auto-migrations upon startup via db.migrate()
# This script serves as an enterprise entrypoint placeholder for Flyway/Liquibase/golang-migrate in the future.
echo "Backend service will auto-apply schema.sql migrations upon connection."

echo "Database initialization complete."
