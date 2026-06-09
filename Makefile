.PHONY: all up up-d down build logs ps clean fclean re reset dev-user dev-user-clean \
  install-auth run-auth install-user run-user install-posts run-posts \
  install-chat run-chat install-gateway run-gateway install-frontend run-frontend \
  install-all

COMPOSE = docker compose --env-file .env

all: up

up:
	$(COMPOSE) up --build

up-d:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down --remove-orphans

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

# Soft clean: stops containers and removes them along with volumes and networks
clean:
	$(COMPOSE) down --volumes --remove-orphans

# Deep clean: does 'clean', plus removes all images and prunes the docker system completely
fclean: clean
	$(COMPOSE) down --rmi all
	docker system prune -af

# Rebuild from scratch
re: fclean up

reset: clean

# Per-service install / run targets
install-auth:
	npm install --prefix backend/services/auth

run-auth:
	npm run start:dev --prefix backend/services/auth

install-user:
	npm install --prefix backend/services/user-management

run-user:
	npm run start:dev --prefix backend/services/user-management

install-posts:
	cd backend/services/posts && bun install

run-posts:
	cd backend/services/posts && bun run dev

install-chat:
	cd backend/services/chat && mix deps.get

run-chat:
	cd backend/services/chat && mix phx.server

install-gateway:
	npm install --prefix backend/api/transcendence-api-gateway

run-gateway:
	npm run start:dev --prefix backend/api/transcendence-api-gateway

install-frontend:
	npm install --prefix frontend

run-frontend:
	npm run dev --prefix frontend

install-all: install-auth install-user install-posts install-chat install-gateway install-frontend

# Start only the database and user service for isolated development
dev-user:
	$(COMPOSE) up -d database user-service

# Stop and wipe volumes for the entire environment
dev-user-clean:
	$(COMPOSE) down -v
