all: full

full:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml up --build -d

down:
	docker compose -f ops/docker-compose.yml -f ops/docker-compose.service.yml -f ops/docker-compose.ops.yml down

prune:
	docker system prune -f

.PHONY: all full down