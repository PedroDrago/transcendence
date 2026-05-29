.PHONY: all up up-d down build logs ps clean fclean re reset dev-user dev-user-clean

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

# Start only the database and user service for isolated development
dev-user:
	$(COMPOSE) up -d database user-service

# Stop and wipe volumes for the entire environment
dev-user-clean:
	$(COMPOSE) down -v
