#!/bin/bash
set -e

echo "PostgreSQL initialization script executing..."

# Ensure default database extensions and parameters if needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOSQL

echo "CareData PostgreSQL initialization complete. Go backend will auto-apply schema migrations on boot."

