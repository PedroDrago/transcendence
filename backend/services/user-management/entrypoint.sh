#!/bin/sh

set -e

# Use PORT from environment or fallback to 3000
APP_PORT=${PORT:-3000}
DB_HOST_NAME=${DB_HOST:-database}
DB_PORT_NUM=5432

echo "Waiting for database at $DB_HOST_NAME:$DB_PORT_NUM..."

# Netcat loop to check database availability
until nc -z "$DB_HOST_NAME" "$DB_PORT_NUM"; do
  echo "Database is not ready yet... retrying in 2 seconds."
  sleep 2
done

echo "Database detected! Proceeding with startup..."

# Run migrations to ensure the schema and tables are ready
# as required by the subject
if [ -f "dist/database/data-source.js" ]; then
    echo "Running database migrations (production build found)..."
    npm run migration:run:prod
else
    echo "Running database migrations (development mode)..."
    npm run migration:run
fi

if [ "$NODE_ENV" = "development" ]; then
    echo "Starting server in DEVELOPMENT mode (watch)..."
    exec npm run start:dev
else
    echo "Starting server in PRODUCTION mode..."
    exec npm run start:prod
fi
