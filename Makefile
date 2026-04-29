.PHONY: all full down prune re wipe-db dev-user dev-user-clean

# Default target
all: full

# Run all services (database, apis, ops)
full:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml up --build -d

# Stop all services
down:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml down

# Clean all unused containers, volumes, and images
prune:
	docker system prune -f

# Clean everything and rebuild from scratch
re:
	@echo "🔄 Rebuilding from scratch..."
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml down -v --rmi all --remove-orphans
	docker system prune -af
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml up --build -d

# Wipe only the database data
wipe-db:
	@echo "🗑️ Wiping database volume..."
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml stop transcendence_database_postgres
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml rm -f transcendence_database_postgres
	docker volume rm -f ops_postgres-data-prod
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml up -d transcendence_database_postgres

# Development rules for user-management service (may be removed later)

# Start only the database and user service for isolated development (hot-reloading)
dev-user:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.dev-user.yml up -d transcendence_database_postgres transcendence_user_management

# Rule to stop and clean up if you need to reset the database quickly
dev-user-clean:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.dev-user.yml down -v
