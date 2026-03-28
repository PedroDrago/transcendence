# Auth Service

Handles identity for the Transcendence project: user registration, login, and JWT issuance.

Built with NestJS + TypeORM + PostgreSQL. Runs as a standalone service on port `4001` and is managed by the project's global Docker Compose.

---

## Responsibilities

- Register users (hash password with bcrypt, persist to DB)
- Login users (validate credentials, issue JWT)
- Issue JWT access tokens

This service owns **identity only** (credentials + tokens). User profiles and social data live in a separate service.

---

## Stack

| Concern | Package |
|---|---|
| Framework | `@nestjs/common`, `@nestjs/core` |
| JWT | `@nestjs/jwt` |
| Auth strategies | `@nestjs/passport`, `passport-local` |
| Password hashing | `bcrypt` |
| ORM | `@nestjs/typeorm`, `typeorm` |
| Database | `pg` (PostgreSQL) |
| Config / env | `@nestjs/config` |
| Validation | `class-validator`, `class-transformer` |

---

## Module Structure

```
src/
├── main.ts                      # Bootstrap, global ValidationPipe, port 4001
├── app.module.ts                # Root: ConfigModule + TypeOrmModule + AuthModule
│
├── auth/
│   ├── auth.module.ts           # Wires PassportModule, JwtModule, strategies, guards
│   ├── auth.controller.ts       # POST /auth/register, POST /auth/login
│   ├── auth.service.ts          # register(), validateUser(), login()
│   ├── strategies/
│   │   └── local.strategy.ts    # Validates username+password, calls validateUser()
│   ├── guards/
│   │   └── local-auth.guard.ts  # Applied to POST /auth/login
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.service.ts         # findByUsername(), create()
│   └── user.entity.ts           # TypeORM entity: id, username, passwordHash, createdAt
│
└── database/
    ├── data-source.ts           # TypeORM DataSource for CLI (migrations)
    └── migrations/
        └── 1742600000000-CreateUsersTable.ts
```

---

## API Endpoints

### `POST /auth/register`

Registers a new user.

**Request body:**
```json
{
  "username": "drago",
  "password": "supersecret"
}
```

**Validation:**
- `username`: string, 3–20 characters
- `password`: string, 8–256 characters

**Responses:**

| Status | Body | Condition |
|---|---|---|
| `201` | `{ message, user: { id, username, createdAt } }` | Success |
| `400` | Validation errors | Invalid body |
| `409` | `Username already exists` | Duplicate username |

---

### `POST /auth/login`

Authenticates a user and returns a JWT.

**Request body:**
```json
{
  "username": "drago",
  "password": "supersecret"
}
```

**Validation:**
- `username`: string, 3–20 characters
- `password`: string, 8–256 characters

> Validation is performed manually inside `LocalStrategy.validate()` via `class-validator`, because Passport extracts credentials from `req.body` directly, bypassing NestJS's `ValidationPipe`.

**Responses:**

| Status | Body | Condition |
|---|---|---|
| `200` | `{ "access_token": "<jwt>" }` | Valid credentials |
| `401` | `Unauthorized` | Wrong username or password, or validation failure |

---

## Data Flows

### Register

```
POST /auth/register
  → ValidationPipe (class-validator on RegisterDto)
  → AuthController.register(dto)
  → AuthService.register(dto)
    → bcrypt.hash(password, 10)
    → UsersService.create(username, passwordHash)
      → check duplicate → 409 if exists
      → usersRepository.save()
      → return user without passwordHash
  → 201 { message: 'registered', user }
```

### Login

```
POST /auth/login
  → LocalAuthGuard triggers LocalStrategy.validate(username, password)
    → plainToInstance(LoginDto) + class-validator validate()
    → errors present → throw 401
    → AuthService.validateUser(username, password)
      → UsersService.findByUsername()
      → bcrypt.compare(password, user.passwordHash)
      → no match → return null → throw 401
      → match → return user without passwordHash
    → user attached to req.user
  → AuthController.login(req.user)
    → AuthService.login(user)
      → JwtService.sign({ sub: user.id, username })
  → 200 { access_token }
```

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

> Change `JWT_SECRET` to a long random string in any real environment.

---

## API Documentation (Swagger)

Interactive docs are available at `http://localhost:4001/docs` when the service is running.

Swagger UI lets you explore and execute all endpoints directly from the browser. The `PATCH /auth/password` endpoint requires a Bearer token — use the **Authorize** button at the top right to set it after logging in.

---

## Running

### Full stack (recommended)

The auth service is part of the global Docker Compose. From the project root:

```bash
make dev    # or: docker compose -f ops/docker-compose.dev.yml up
```

The service starts at `http://localhost:4001` and connects to the shared PostgreSQL instance.

### Standalone (auth + its own DB)

Useful for developing or testing the auth service in isolation. Requires a `.env` file in this directory.

```bash
docker compose up --build
```

- API: `http://localhost:4001`
- PostgreSQL data persisted in a named volume `postgres-auth-data`

```bash
docker compose down          # stop
docker compose down -v       # stop and delete DB volume
```

### Local (no Docker)

Requires a running PostgreSQL instance matching the `.env` config.

```bash
npm install
npm run start:dev
```

---

## Migrations

Migrations run automatically on startup (`migrationsRun: true`).

To run or revert manually (requires a running DB matching `.env`):

```bash
npm run migration:run
npm run migration:revert
```

Migration files live in `src/database/migrations/`.

---

## Notes

- `passwordHash` is never returned from any endpoint — stripped in `UsersService.create()` and `AuthService.validateUser()`
- `ValidationPipe` is global with `whitelist: true` and `forbidNonWhitelisted: true`
- `LocalStrategy` manually validates the `LoginDto` because Passport bypasses `ValidationPipe`
- `UsersModule` is internal — there is no `UsersController`. User data is accessed only through auth flows
- All user data lives under the `auth` PostgreSQL schema
