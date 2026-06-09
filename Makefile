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

# Per-service targets: make build-<service> / up-<service> / logs-<service> / restart-<service>
# Examples: make build-posts-service  make logs-gateway  make restart-auth-service
build-%:
	$(COMPOSE) build $*

up-%:
	$(COMPOSE) up -d --build $*

logs-%:
	$(COMPOSE) logs -f $*

restart-%:
	$(COMPOSE) restart $*

down-%:
	$(COMPOSE) down $*
