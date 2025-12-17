.PHONY: all dev prod build-front-end build-back-end down-dev down-prod clean

# Default target - runs development environment
all: dev

# Development environment
dev:
	@echo "🚀 Starting development environment..."
	cd ops && docker compose -f docker-compose.dev.yml up

# Development environment in detached mode
dev-d:
	@echo "🚀 Starting development environment in background..."
	cd ops && docker compose -f docker-compose.dev.yml up -d

# Production environment
prod:
	@echo "🚀 Starting production environment..."
	cd ops && docker compose -f docker-compose.prod.yml up -d

# Stop development environment
down-dev:
	@echo "🛑 Stopping development environment..."
	cd ops && docker compose -f docker-compose.dev.yml down

# Stop production environment
down-prod:
	@echo "🛑 Stopping production environment..."
	cd ops && docker compose -f docker-compose.prod.yml down

# Clean all containers, volumes and images
clean:
	@echo "🧹 Cleaning up..."
	cd ops && docker compose -f docker-compose.dev.yml down -v
	cd ops && docker compose -f docker-compose.prod.yml down -v
	docker system prune -f

# Build and run frontend standalone
build-front-end:
	docker build -t transcendence-frontend -f frontend/Dockerfile frontend/.
	docker run -p 3000:3000 transcendence-frontend

# Build and run backend standalone
build-back-end:
	docker build -t transcendence-backend -f backend/api/transcendence-api-gateway/Dockerfile backend/api/transcendence-api-gateway/.
	docker run -p 4000:4000 transcendence-backend