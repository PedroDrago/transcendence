# Auth Service — Implementation Plan

## Goal
A standalone NestJS microservice that handles **basic authentication** (username/email + password) and issues **JWT access tokens**. The API Gateway forwards `/auth/*` requests to this service and validates JWTs on all other protected routes.

---

## References

| Topic | Link |
|-------|------|
| NestJS Authentication guide | https://docs.nestjs.com/security/authentication |
| NestJS JWT | https://docs.nestjs.com/security/authentication#jwt-token |
| Passport.js strategies | https://www.passportjs.org/concepts/authentication/strategies/ |
| `passport-local` | https://www.passportjs.org/packages/passport-local/ |
| `passport-jwt` | https://www.passportjs.org/packages/passport-jwt/ |
| NestJS Guards | https://docs.nestjs.com/guards |
| NestJS TypeORM | https://docs.nestjs.com/techniques/database |
| TypeORM entities | https://typeorm.io/entities |
| bcrypt (password hashing) | https://github.com/kelektiv/node.bcrypt.js |
| NestJS HttpModule (for proxying in gateway) | https://docs.nestjs.com/techniques/http-module |
| NestJS Config / env vars | https://docs.nestjs.com/techniques/configuration |
| class-validator (DTO validation) | https://github.com/typestack/class-validator |

---

## Phase 1 — Scaffold the Auth Service

### 1.1 Generate a new NestJS project
```bash
# from backend/services/
npx @nestjs/cli new auth-service
cd auth-service
```

### 1.2 Install dependencies
```bash
# Auth & JWT
npm install @nestjs/passport @nestjs/jwt passport passport-local passport-jwt

# Type declarations
npm install -D @types/passport-local @types/passport-jwt

# Database
npm install @nestjs/typeorm typeorm pg

# Password hashing
npm install bcrypt
npm install -D @types/bcrypt

# Validation
npm install class-validator class-transformer

# Config
npm install @nestjs/config
```

### 1.3 Module structure to build

```
src/
├── auth/
│   ├── auth.module.ts          # imports UsersModule, JwtModule, PassportModule
│   ├── auth.controller.ts      # POST /auth/register, POST /auth/login
│   ├── auth.service.ts         # validateUser(), login(), register()
│   ├── dto/
│   │   ├── register.dto.ts     # { username, email, password }
│   │   └── login.dto.ts        # { email, password }
│   └── strategies/
│       ├── local.strategy.ts   # validates email+password, used on /login
│       └── jwt.strategy.ts     # validates Bearer token, used on protected routes
├── users/
│   ├── users.module.ts
│   ├── users.service.ts        # findByEmail(), findById(), create()
│   └── user.entity.ts          # id, username, email, passwordHash, createdAt
├── app.module.ts               # imports ConfigModule, TypeOrmModule, AuthModule
└── main.ts                     # listens on PORT env var (default 4001)
```

---

## Phase 2 — Core Concepts to Understand

### Passport Strategies
- **LocalStrategy**: receives `email` + `password` from request body, calls `authService.validateUser()`, returns the user object on success (or throws `UnauthorizedException`)
- **JwtStrategy**: reads `Authorization: Bearer <token>` header, verifies signature with `JWT_SECRET`, returns decoded payload

### Guards
- `@UseGuards(AuthGuard('local'))` on `POST /auth/login` — triggers LocalStrategy
- `@UseGuards(AuthGuard('jwt'))` on protected routes — triggers JwtStrategy
- In the **gateway**, you'll apply a global JWT guard so every request (except `/auth/*`) is validated before being proxied

### JWT Payload
Keep it minimal:
```json
{ "sub": "<userId>", "email": "<email>", "iat": 1234, "exp": 1234 }
```

### Password Hashing
Never store plaintext passwords. Use `bcrypt.hash(password, 10)` on register and `bcrypt.compare(plain, hash)` on login.

---

## Phase 3 — Add a Dockerfile

Copy the pattern from the existing gateway `Dockerfile.dev` and `Dockerfile`. The auth service is just another NestJS app — same build steps, different port (`4001`).

---

## Phase 4 — Register in Docker Compose

### `ops/docker-compose.dev.yml` — add:
```yaml
auth-service:
  image: node:20-alpine
  working_dir: /app
  volumes:
    - ../backend/services/auth-service:/app
  ports:
    - "4001:4001"
  environment:
    NODE_ENV: development
    PORT: 4001
    JWT_SECRET: dev_secret_change_me
    DB_HOST: db
    DB_PORT: 5432
    DB_USER: transcendence
    DB_PASSWORD: transcendence_dev
    DB_NAME: transcendence_dev
  networks:
    - transcendence-network
  depends_on:
    - db
  command: sh -c "npm install && npm run start:dev"
```

---

## Phase 5 — Connect the Auth Service to the API Gateway

The gateway acts as a reverse proxy. For `/auth/*` routes it simply forwards the request to the auth service. For all other protected routes it first validates the JWT locally before proxying.

### 5.1 Install proxy dependencies in the gateway
```bash
cd backend/api/transcendence-api-gateway
npm install @nestjs/axios axios http-proxy-middleware
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
npm install @nestjs/config
```

### 5.2 Gateway JWT Guard (validates all non-auth traffic)
```
src/
├── auth/
│   ├── jwt.strategy.ts         # same as in auth service — reads JWT_SECRET env var
│   └── jwt-auth.guard.ts       # extends AuthGuard('jwt'), mark as @Injectable()
└── app.module.ts               # register JwtModule, PassportModule, ConfigModule
```
Apply the guard globally in `main.ts` or register it as a global guard in `AppModule`.
Use `@Public()` decorator (custom metadata) to opt-out on `/auth/*` routes.

### 5.3 Proxy Controller
Create a controller in the gateway that catches `/auth/*` and forwards it:

```typescript
// src/proxy/auth-proxy.controller.ts
@All('auth/*path')
@Public()                         // skip JWT guard
async proxyToAuth(@Req() req, @Res() res) {
  // forward to http://auth-service:4001
}
```

You can use `http-proxy-middleware` to create a NestJS middleware that proxies entire route prefixes — this is cleaner than writing individual forwarding methods.

### 5.4 Environment variable wiring
Both services must share the **same** `JWT_SECRET`. Inject it via docker-compose environment. The gateway uses the secret only to **verify** tokens; the auth service uses it to **sign** them.

### 5.5 Communication inside Docker
Services communicate by **service name** (Docker DNS):
- Gateway → Auth: `http://auth-service:4001`
- Never use `localhost` between containers; they are separate network hosts.

---

## Checklist

- [ ] Scaffold auth-service with NestJS CLI
- [ ] Install and configure TypeORM + PostgreSQL connection
- [ ] Create `User` entity
- [ ] Implement `UsersService` (create, findByEmail, findById)
- [ ] Implement `LocalStrategy` + `JwtStrategy`
- [ ] Implement `AuthController` (register, login endpoints)
- [ ] Implement `AuthService` (validateUser, login, register)
- [ ] Write Dockerfile and Dockerfile.dev for auth-service
- [ ] Add auth-service to docker-compose files
- [ ] Add JWT guard to the API Gateway
- [ ] Add proxy middleware in gateway for `/auth/*`
- [ ] Wire `JWT_SECRET` in all compose files
- [ ] Test end-to-end: register → login → get token → access protected gateway route
