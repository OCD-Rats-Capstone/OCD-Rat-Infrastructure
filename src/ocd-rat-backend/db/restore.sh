#!/bin/bash
set -e

echo "Restoring Database Schema..."
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" /docker-entrypoint-initdb.d/schema.dump || echo "Schema restore had non-fatal warnings"

echo "Restoring Database Data..."
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" /docker-entrypoint-initdb.d/data.dump || echo "Data restore had non-fatal warnings"

echo "Database restoration complete!"
