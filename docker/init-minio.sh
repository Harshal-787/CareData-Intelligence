#!/bin/sh
set -e

echo "Running MinIO Initialization..."

# Wait for MinIO to be available
until curl -sf http://minio:9000/minio/health/live; do
  echo "Waiting for MinIO..."
  sleep 2
done

echo "MinIO is up. Configuring mc alias and buckets..."

# Configure the MinIO Client (mc)
mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Create required Enterprise buckets if they don't exist
mc mb --ignore-existing myminio/raw-data
mc mb --ignore-existing myminio/processed-data
mc mb --ignore-existing myminio/export-reports

# Set public download policy for export reports (optional based on security needs)
# mc anonymous set download myminio/export-reports

echo "MinIO initialization complete."
