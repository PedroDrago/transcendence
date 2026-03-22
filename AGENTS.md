# Transcendence — Architecture Overview

## Stack

| Layer       | Technology        | Port |
|-------------|-------------------|------|
| Frontend    | Next.js 16 (PWA)  | 3000 |
| API Gateway | NestJS 11         | 4000 |
| Auth Service| NestJS 11         | 4001 |
| Database    | PostgreSQL 16     | 5432 |

All services run in Docker on a shared bridge network (`transcendence-network`), orchestrated by docker-compose.

## Request Flow

```
Browser → Frontend (3000) → API Gateway (4000) → [service] → PostgreSQL
```

The **API Gateway** is the single entry point for all backend traffic. It authenticates incoming requests (validates JWTs) and proxies them to the appropriate internal service. Internal services are never exposed to the public.

## Services

### API Gateway (`backend/api/transcendence-api-gateway`)
- Receives all client HTTP requests
- Validates JWT on protected routes via a global guard
- Forwards requests to downstream services via HTTP proxy
- Routes: `/auth/*` → auth-service, `/game/*` → game-service (future), etc.

### Auth Service (`backend/services/auth-service`)
- Handles registration, login, and token issuance
- Issues signed JWTs (access + refresh tokens)
- Owns the `users` table in PostgreSQL
- Only reachable from the gateway (internal network)

### Frontend (`frontend`)
- Next.js PWA with i18n (en, fr, pt)
- Communicates only with the API Gateway, never directly with services

## Key Conventions
- Services communicate via HTTP (REST) over the internal Docker network
- JWT secret is shared via environment variable (`JWT_SECRET`) injected at runtime
- Each service has its own `Dockerfile` and `Dockerfile.dev`
- Dev environment uses volume mounts for hot reload; prod uses multi-stage builds
