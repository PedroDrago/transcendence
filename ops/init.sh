#!/bin/bash

# ==============================================================================
# 1. Global Configurations (Edit here if you change any port or host)
# ==============================================================================

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=4000
AUTH_PORT=4001
CHAT_PORT=4002
USER_PORT=3002
POSTS_PORT=3333
DB_PORT=5432

# Hosts / Internal URLs (Used by Docker containers)
FRONTEND_URL="http://frontend:${FRONTEND_PORT}"
GATEWAY_URL="http://gateway:${BACKEND_PORT}"
AUTH_SERVICE_URL="http://auth-service:${AUTH_PORT}"
USER_SERVICE_URL="http://user-service:${USER_PORT}"
CHAT_SERVICE_URL="http://chat-service:${CHAT_PORT}"
POSTS_SERVICE_URL="http://posts-service:${POSTS_PORT}"
DB_HOST="database"

# Public URLs (Used by the Browser and OAuth Providers via Nginx HTTPS)
PUBLIC_FRONTEND_URL="https://localhost"
PUBLIC_API_URL="https://localhost:8443"

# Default Values (Database and MinIO)
POSTGRES_USER="transcendence"
POSTGRES_DB="transcendence"
MINIO_USER="minioadmin"

# Validate custom Nginx ports
EFFECTIVE_HTTPS_PORT=${HTTPS_PORT:-443}
EFFECTIVE_API_HTTPS_PORT=${API_HTTPS_PORT:-8443}

if [ "$EFFECTIVE_HTTPS_PORT" == "$EFFECTIVE_API_HTTPS_PORT" ]; then
    echo "❌ Error: HTTPS_PORT and API_HTTPS_PORT cannot be the same ($EFFECTIVE_HTTPS_PORT)."
    exit 1
fi

# ==============================================================================

MODE=$1

# Helper function to generate passwords
generate_secret() {
    openssl rand -hex 32
}

echo "======================================"
echo "    Transcendence Setup Script"
echo "======================================"

# --- Global .env Generation ---
if [ -f .env ]; then
    echo "⏭️  Global .env file already exists. Skipping generation."
else
    if [ "$MODE" == "--interactive" ]; then
        echo "--- Interactive Setup ---"
        read -p "Enter Postgres user [default: $POSTGRES_USER]: " input
        POSTGRES_USER=${input:-$POSTGRES_USER}
        
        read -p "Enter Postgres password: " -s POSTGRES_PASSWORD; echo
        
        read -p "Enter database name [default: $POSTGRES_DB]: " input
        POSTGRES_DB=${input:-$POSTGRES_DB}
        
        read -p "Enter MinIO user [default: $MINIO_USER]: " input
        MINIO_USER=${input:-$MINIO_USER}
        
        read -p "Enter MinIO password: " -s MINIO_PASSWORD; echo
        
        read -p "Enter JWT secret: " -s JWT_SECRET; echo
    else
        echo "⚙️  Automatic Mode: Generating secure global passwords..."
    fi

    # Ensure secrets are not empty (fallbacks)
    if [ -z "$POSTGRES_PASSWORD" ]; then POSTGRES_PASSWORD=$(generate_secret); fi
    if [ -z "$MINIO_PASSWORD" ]; then MINIO_PASSWORD=$(generate_secret); fi
    if [ -z "$JWT_SECRET" ]; then JWT_SECRET=$(generate_secret); fi

    cat << EOF > .env
## Ports
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT}
AUTH_PORT=${AUTH_PORT}
CHAT_PORT=${CHAT_PORT}
USER_PORT=${USER_PORT}
DB_HOST_PORT=${DB_PORT}

## Postgres
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB

## Redis
REDIS_URL=redis://redis:6379

## MinIO
MINIO_ACCESS_KEY_ID=$MINIO_USER
MINIO_SECRET_ACCESS_KEY=$MINIO_PASSWORD
MINIO_BUCKET=transcendence
MINIO_ENDPOINT=http://minio:9000

## Jaeger
OTEL_EXPORTER_URL=http://jaeger:4318/v1/traces

## JWT
JWT_SECRET=$JWT_SECRET
EOF
    echo "✅ Global .env generated!"
fi

# --- Microservices .env Generation ---

GATEWAY_ENV="./backend/api/transcendence-api-gateway/.env"
if [ ! -f "$GATEWAY_ENV" ]; then
    cat << EOF > "$GATEWAY_ENV"
NODE_ENV=production
PORT=${BACKEND_PORT}
FRONTEND_ORIGIN=${PUBLIC_FRONTEND_URL}
ALLOWED_ORIGINS=${PUBLIC_FRONTEND_URL},${FRONTEND_URL},${GATEWAY_URL}
AUTH_SERVICE_URL=${AUTH_SERVICE_URL}
USER_SERVICE_URL=${USER_SERVICE_URL}
CHAT_SERVICE_URL=${CHAT_SERVICE_URL}
POSTS_SERVICE_URL=${POSTS_SERVICE_URL}
EOF
    echo "✅ Gateway .env generated!"
else
    echo "⏭️  Gateway .env already exists."
fi

AUTH_ENV="./backend/services/auth/.env"
if [ ! -f "$AUTH_ENV" ]; then
    cat << EOF > "$AUTH_ENV"
NODE_ENV=production
PORT=${AUTH_PORT}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
JWT_EXPIRES_IN=1h
USER_SERVICE_URL=${USER_SERVICE_URL}
FRONTEND_ORIGIN=${PUBLIC_FRONTEND_URL}
ALLOWED_ORIGINS=${PUBLIC_FRONTEND_URL},${FRONTEND_URL},${GATEWAY_URL}
GOOGLE_CLIENT_ID=disabled
GOOGLE_CLIENT_SECRET=disabled
GOOGLE_CALLBACK_URL=${PUBLIC_API_URL}/auth/google/callback
GOOGLE_TEST_CALLBACK_URL=http://localhost:${AUTH_PORT}/auth/google/callback/test
FRONTEND_OAUTH_SUCCESS_URL=${PUBLIC_FRONTEND_URL}/auth/callback
EOF
    echo "✅ Auth .env generated!"
else
    echo "⏭️  Auth .env already exists."
fi

USER_ENV="./backend/services/user-management/.env"
if [ ! -f "$USER_ENV" ]; then
    cat << EOF > "$USER_ENV"
NODE_ENV=production
PORT=${USER_PORT}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
EOF
    echo "✅ User-Management .env generated!"
else
    echo "⏭️  User-Management .env already exists."
fi

CHAT_ENV="./backend/services/chat/.env"
if [ ! -f "$CHAT_ENV" ]; then
    cat << EOF > "$CHAT_ENV"
MIX_ENV=dev
PORT=${CHAT_PORT}
PHX_IP=0.0.0.0
PHX_SERVER="true"
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DEV_SECRET_KEY_BASE=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
EOF
    echo "✅ Chat .env generated!"
else
    echo "⏭️  Chat .env already exists."
fi

POSTS_ENV="./backend/services/posts/.env"
if [ ! -f "$POSTS_ENV" ]; then
    cat << EOF > "$POSTS_ENV"
NODE_ENV=development
HOST=0.0.0.0
PORT=${POSTS_PORT}
ORIGIN=${FRONTEND_URL}
USER_SERVICE_URL=${USER_SERVICE_URL}
SERVICE_NAME=posts
EOF
    echo "✅ Posts .env generated!"
else
    echo "⏭️  Posts .env already exists."
fi

# --- SSL Certificates Generation ---
SSL_DIR="ops/nginx/certs"
mkdir -p "$SSL_DIR"
if [ ! -f "$SSL_DIR/server.crt" ]; then
    echo "🔒 Generating SSL certificates (self-signed)..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/server.key" \
        -out "$SSL_DIR/server.crt" \
        -subj "/C=BR/ST=Rio/L=Rio/O=42/CN=localhost" > /dev/null 2>&1
    echo "✅ SSL Certificates generated!"
else
    echo "⏭️  SSL Certificates already exist."
fi

echo "🚀 Setup completed successfully!"
