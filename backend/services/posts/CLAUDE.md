# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Posts microservice for the Transcendence project. Built with **Elysia** (Bun-native web framework), **Drizzle ORM** (PostgreSQL), **Redis** for caching, and **MinIO/R2** for media storage.

Part of a microservices architecture: Frontend (Next.js) → API Gateway (NestJS :4000) → Posts Service (Elysia :3333) + Auth Service (NestJS :4001). Services share a PostgreSQL database with separate schemas. JWT-based auth with a shared secret.

## Commands

```bash
bun run dev          # Start dev server with watch mode
bun run build        # Compile to standalone binary
bun test             # Run all tests (uses .env.test)
bun test <file>      # Run a single test file
bunx ultracite check # Lint check (Biome)
bunx ultracite fix   # Lint fix (Biome)
bun run db:generate  # Generate Drizzle migrations from schema changes
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
```

Local infrastructure (Postgres, Redis, MinIO): `docker compose up -d`

Full stack from monorepo root: `make dev` or `make dev-d` (detached).

## Architecture

**Elysia plugin composition** — the app is built by composing Elysia instances via `.use()`. Entry point: `src/http/server.ts` → `src/http/app.ts` chains plugins, middlewares, health checks, and route groups.

**Routes** are individual Elysia instances in `src/http/routes/<domain>/`. Each file exports one route. Business logic and DB queries live directly in route handlers (no separate service/controller layer).

**Auth macro** (`src/http/middlewares/auth.ts`): Routes declare `auth: true` in their options object. The macro extracts the Bearer JWT, verifies it, and injects `userId` (from `sub` claim) into the handler context. All current routes require auth.

**Database**: Drizzle ORM with a dedicated `posts` PostgreSQL schema (`pgSchema('posts')`). Schemas in `src/database/schemas/`, migrations in `src/database/migrations/`. Uses `drizzle-zod` to derive Zod validation schemas from table definitions. Casing is `snake_case` at the DB level, camelCase in TypeScript.

**Media upload flow**: Client gets a presigned URL (`POST /presign-url`, context = `'post'` or `'story'`) → uploads directly to `tmp/<context>/` prefix in R2/MinIO → creates resource (`POST /posts` or `POST /stories`) → server moves file from `tmp/` to `posts/` or `stories/` prefix.

**Caching**: Individual resources cached in Redis with 600s TTL (key: `posts:{id}`, `stories:{id}`). User lists cached on first page only (key: `posts:user:{userId}`, `stories:user:{userId}`). Signed media URLs cached at 3000s TTL. Cache invalidated on update/delete via `redis.del()`.

**Stories vs Posts**: Stories have `expiresAt` (24h from creation), no `caption`, no update route. Get and list queries filter out expired stories (`expiresAt > now()`). Cached stories are also checked for expiration client-side.

## Testing

Integration/E2E tests using Bun's built-in test runner (`bun:test`). Tests are co-located with routes as `.spec.ts` files. Tests use the **Eden treaty client** (`@elysiajs/eden`) for type-safe HTTP calls against the real app instance.

Test helpers in `test/helpers/`: `auth.ts` (JWT tokens), `create-post.ts` / `create-story.ts` (direct DB inserts), `upload.ts` (presign + PUT to MinIO). Teardown in `test/teardown.ts` truncates tables, flushes Redis, and clears MinIO.

Tests require infrastructure running (`docker compose up -d`) and use `.env.test`.

## Code Style

- Biome via ultracite: single quotes, no semicolons (as-needed)
- Path aliases: `@/*` → `./src/*`, `@test/*` → `./test/*`
- IDs are UUIDv7
