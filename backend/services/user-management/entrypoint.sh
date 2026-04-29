#!/bin/sh

set -e

# Use PORT from environment or fallback to 3000
DB_HOST_NAME=${DB_HOST:-database}
DB_PORT_NUM=5432

echo "Waiting for database at $DB_HOST_NAME:$DB_PORT_NUM..."

# Netcat loop to check database availability
until nc -z "$DB_HOST_NAME" "$DB_PORT_NUM"; do
  echo "Database is not ready yet... retrying in 2 seconds."
  sleep 2
done

echo "Database detected! Proceeding with startup..."

# Run migrations and start server based on the environment
if [ "$NODE_ENV" = "development" ]; then
    echo "Running database migrations (development mode)..."
    npm run migration:run

    echo "Starting server in DEVELOPMENT mode (watch)..."
    exec npm run start:dev
else
    echo "Running database migrations (production mode)..."
    npm run migration:run:prod

    echo "Starting server in PRODUCTION mode..."
    exec npm run start:prod
fi
