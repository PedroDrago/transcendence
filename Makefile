COMPOSE = docker compose --env-file .env

all: envs up

envs:
	@./ops/init.sh --auto

setup:
	@./ops/init.sh --interactive

up: envs
	$(COMPOSE) up --build

up-d: envs
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

# Deep clean: does 'clean', plus removes all images, prunes the docker system completely, and wipes generated secrets
fclean: clean
	$(COMPOSE) down --rmi all
	docker system prune -af
	@$(MAKE) clean-envs

clean-envs:
	@echo "Removing all .env files and SSL certificates..."
	@find . -type f -name ".env" -exec rm -f {} +
	@rm -rf ops/nginx/certs

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
