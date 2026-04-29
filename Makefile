all: full

full:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml up --build -d

down:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml down

prune:
	docker system prune -f

# Start only the database and user service for isolated development (hot-reloading)
dev-user:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.dev-user.yml up -d transcendence_database_postgres transcendence_user_management

# Rule to stop and clean up if you need to reset the database quickly
dev-user-clean:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.dev-user.yml down -v

.PHONY: all full down dev-user dev-user-clean
