all:
	docker compose -f ops/docker-compose.yml up --build -d

ops:
	docker compose -f ops/docker-compose.ops.yml up --build -d

.PHONY: all