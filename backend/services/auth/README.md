# Auth Service

Handles identity for the Transcendence project: registration, login, and password management.

---

# Part 1 — Reference

## Stack

| Concern | Package |
|---|---|
| Framework | NestJS 11 |
| JWT | `@nestjs/jwt`, `passport-jwt` |
| Auth strategies | `@nestjs/passport`, `passport-local` |
| Password hashing | `bcrypt` |
| ORM | TypeORM |
| Database | PostgreSQL 16 |
| Validation | `class-validator`, `class-transformer` |
| API docs | `@nestjs/swagger` |

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Register a new user |
| `POST` | `/auth/login` | None | Login, receive JWT |
| `PATCH` | `/auth/password` | Bearer JWT | Change password |

Interactive docs: **http://localhost:4001/docs**

---

## Environment Variables

```env
DB_HOST=database
DB_PORT=5432
DB_USER=transcendence
DB_PASSWORD=transcendence_dev
DB_NAME=transcendence_dev
PORT=4001
JWT_SECRET=changeme
JWT_EXPIRES_IN=1h
```

---

## Running

### Full stack
```bash
# from project root
make up
```

### Local (no Docker)
```bash
npm install
npm run start:dev
```

---

## Tests

End-to-end tests hit real endpoints against a dedicated `transcendence_test` database.
Requires the shared postgres to be running (`make up` or the `database` service).

```bash
# from backend/services/auth/
npm run test:e2e
```

---

## Migrations

Run automatically on startup. To run or revert manually:

```bash
npm run migration:run
npm run migration:revert
```

---

# Part 2 — Concepts

## What is an auth service?

In a microservices architecture, the auth service is the single place responsible for answering two questions:

- **Who are you?** — verifies a username and password, issues a token
- **Are you who you claim to be?** — verifies a token on protected requests

Every other service (chat, posts, etc.) trusts the token issued here. They don't store passwords or do their own authentication.

---

## Passwords — why we never store them as-is

Storing plain passwords is a critical security failure. If the database leaks, every user's password is exposed — and since people reuse passwords, that means their email, bank, and everything else is compromised too.

We use **bcrypt** to hash passwords before storing them:

```
"password123"  →  bcrypt.hash()  →  "$2b$10$X9v3k..."  (stored in DB)
```

Bcrypt is one-way — you can't reverse it to get the original password back. On login, we hash what the user typed and compare the two hashes. The original password never touches the database.

---

## JWT — what it is and why we use it

After login, we give the user a **JSON Web Token (JWT)**. It looks like this:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI4NDg1MjY4MyIsInVzZXJuYW1lIjoiZHJhZ28ifQ.abc123
```

It's three Base64 parts separated by dots: `header.payload.signature`

The payload contains the user's data:
```json
{ "sub": "84852683-...", "username": "drago", "exp": 1774720801 }
```

The signature is generated with `JWT_SECRET` — only our server can produce a valid one. When a protected request comes in, we verify the signature. If it's valid, we trust the payload without touching the database.

This is called **stateless auth** — the server doesn't need to remember who is logged in. The token itself carries the proof.

---

## Passport strategies — how authentication is plugged in

NestJS uses **Passport** as an authentication middleware layer. A "strategy" is a class that defines how to extract and validate credentials for one specific method.

This service has two:

**LocalStrategy** — used on `POST /auth/login`
Extracts `username` and `password` from the request body, calls `validateUser()`, and if valid, attaches the user to `req.user`.

**JwtStrategy** — used on `PATCH /auth/password`
Extracts the `Bearer` token from the `Authorization` header, verifies its signature and expiry, and attaches the decoded payload to `req.user`.

A **Guard** wraps a strategy and applies it to a route:

```
Request → Guard → Strategy → (valid) → Route handler
                           → (invalid) → 401 Unauthorized
```

---

## The `auth` PostgreSQL schema

All tables for this service live under a dedicated `auth` schema inside the shared database. Instead of one flat namespace, each service gets its own:

```
transcendence_dev
├── auth.users        ← this service
├── posts.posts       ← future posts service
└── chat.messages     ← future chat service
```

This keeps services isolated at the database level while sharing one PostgreSQL instance.

---

## Why UUID instead of auto-increment IDs

User IDs are shared across every service — the chat service, posts service, and gateway all reference users by their ID. Auto-increment IDs (`1`, `2`, `3`...) are only unique within one table. Two services could independently have a user with `id: 1`, causing collisions.

UUIDs (`84852683-1980-4ce2-a733-641307a966e5`) are globally unique by design — generated from randomness, not a counter. A user's identity is unambiguous across the entire system.
