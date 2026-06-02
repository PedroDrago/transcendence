# Transcendence
## Version 19.0

Microservices study project for a social network.

## Stack Startup

This repository now has a single source of truth for local infrastructure:

- `compose.yml`
- `.env`
- `Makefile`

Start the full stack with:

```bash
make up
```

Run it in the background with:

```bash
make up-d
```

Stop everything with:

```bash
make down
```

Remove containers and volumes with:

```bash
make clean
```

## Services

- API gateway: `http://localhost:4000`

Only the API gateway is published to the host. Application services and infrastructure stay on the internal Docker network:

- Frontend: `http://frontend:3000`
- Auth service: `http://auth-service:4001`
- Chat service: `http://chat-service:4002`
- User service: `http://user-service:3002`
- Posts service: `http://posts-service:3333`
- PostgreSQL: `database:5432`
- Redis: `redis:6379`
- MinIO API: `http://minio:9000`
- MinIO console: `http://minio:9001`
- Jaeger UI: `http://jaeger:16686`

## Database Layout

All services share one PostgreSQL instance. Isolation happens by schema:

- `auth`
- `chat`
- `posts`
- `user_management`

The bootstrap SQL at `ops/init.sql` creates the required extensions and schemas before the application services start.
