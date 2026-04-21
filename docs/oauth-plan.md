# OAuth2 Implementation Plan

## Context

The auth service already has local (username+password) auth with JWT issuance and a Passport.js strategy pattern. This plan adds OAuth2 via Google (Phase 1) and 42 School (Phase 2), then wires JWT validation into the API Gateway (Phase 3).

This plan is educational — every implementation step is anchored to the underlying concept. Read the concept before writing the code.

---

## Phase 0 — Conceptual Foundation (Read Before Coding)

### 0.1 — What OAuth2 Is (and Isn't)

OAuth2 is an **authorization delegation** protocol, not an authentication protocol. Google authorizes your app to access a user's profile data on the user's behalf. You interpret that profile to establish identity in your own system.

This distinction matters: you will issue **your own JWT** after OAuth2 completes. You are not using Google's access token as your session token. Ever.

The four grant types (RFC 6749):
1. **Authorization Code** — what you will use. Browser is involved. Server exchanges a short-lived `code` for tokens. Most secure for web apps.
2. **Implicit** — deprecated, do not use.
3. **Client Credentials** — machine-to-machine, no user involved.
4. **Resource Owner Password** — deprecated, effectively basic auth.

> **Read:** https://datatracker.ietf.org/doc/html/rfc6749

### 0.2 — The Authorization Code Flow, Step by Step

```
Browser          Your Server (4001)         Google
  |                     |                      |
  | GET /auth/google    |                      |
  |-------------------->|                      |
  |   302 → accounts.google.com/o/oauth2/auth  |
  |        ?client_id=YOUR_ID                  |
  |        &redirect_uri=.../callback          |
  |        &response_type=code                 |
  |        &scope=email profile                |
  |        &state=RANDOM_NONCE                 |
  |<--------------------|                      |
  |                                            |
  |  [User sees Google consent screen]         |
  |                                            |
  | GET /auth/google/callback?code=X&state=N  |
  |-------------------->|                      |
  |                     | POST /oauth2/token   |
  |                     |   code=X             |
  |                     |   client_id+secret   |
  |                     |   redirect_uri       |
  |                     |--------------------->|
  |                     | { access_token,      |
  |                     |   id_token }         |
  |                     |<---------------------|
  |                     | GET userinfo         |
  |                     |--------------------->|
  |                     | { email, sub, name } |
  |                     |<---------------------|
  |                     | findOrCreate user    |
  |                     | issue YOUR JWT       |
  | { access_token: JWT }|                     |
  |<--------------------|                      |
```

The `code` is single-use and short-lived (~10 min). The exchange happens server-to-server — the browser never sees Google's tokens.

> **Read:** https://www.oauth.com/oauth2-servers/server-side-apps/authorization-code/

### 0.3 — The `state` Parameter (CSRF Protection)

A random nonce your server generates before redirecting. Google echoes it back in the callback. Your server validates it matches.

Without `state`, an attacker can trick a victim into clicking a pre-crafted callback URL that links the attacker's Google account to the victim's session — a login CSRF attack.

`passport-google-oauth20` handles state automatically. You need to understand it to debug failures (usually a missing session configuration).

> **Read:** https://datatracker.ietf.org/doc/html/rfc6749#section-10.12

### 0.4 — Passport.js Strategy Pattern

Passport abstracts authentication into "strategies." Each strategy encapsulates one method's flow.

The contract for every strategy is `validate()`:
- Receives verified identity data (for OAuth: `accessToken`, `refreshToken`, `profile`)
- Returns the user object that becomes `req.user`
- Throw `UnauthorizedException` to reject

Your existing `LocalStrategy` and `JwtStrategy` already follow this pattern. `GoogleStrategy` will be structurally identical.

> **Read:** https://docs.nestjs.com/recipes/passport

### 0.5 — Why Issue Your Own JWT After OAuth

When Google's callback completes you receive:
- **Google access token** — authorizes calls to Google APIs. Expires on Google's schedule. Scoped to Google.
- **Google ID token** — a JWT with claims about the user (`sub`, `email`, etc.). This is what Passport parses into `profile`.

You should **not** use Google's access token as your session because:
1. It expires when Google decides, not you.
2. Your microservices don't speak Google's token format.
3. If leaked, it grants access to the user's Google account.

After OAuth completes, call `authService.login(user)` — the same function used by local auth — and discard Google's tokens.

> **Read:** https://openid.net/specs/openid-connect-core-1_0.html#IDToken

---

## Phase 1 — Google OAuth2

### Step 1 — Install Dependencies

```bash
cd backend/services/auth
npm install passport-google-oauth20
npm install --save-dev @types/passport-google-oauth20
```

### Step 2 — Register the Google OAuth Application

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID → Web Application
3. Under **Authorized redirect URIs**, add: `http://localhost:4001/auth/google/callback`
4. Copy the Client ID and Client Secret

The redirect URI must match **exactly** what you put in `GOOGLE_CALLBACK_URL`. Any mismatch → `redirect_uri_mismatch`. This is intentional: it prevents attackers from substituting a different callback URL.

Add to `backend/services/auth/.env`:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4001/auth/google/callback
```

### Step 3 — Extend the User Entity

**File:** `backend/services/auth/src/users/user.entity.ts`

OAuth users arrive without a password. Making `passwordHash` nullable encodes this intent. The `oauthProvider` enum distinguishes "local user with no password (a bug)" from "OAuth user with no password (expected)".

```typescript
export enum OAuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  SCHOOL42 = '42',
}

@Entity({ name: 'users', schema: 'auth' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })          // null for OAuth users
  passwordHash: string | null;

  @Column({ nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'enum', enum: OAuthProvider, default: OAuthProvider.LOCAL })
  oauthProvider: OAuthProvider;

  @Column({ nullable: true })
  oauthId: string | null;             // Google's stable `sub` claim

  @CreateDateColumn()
  createdAt: Date;
}
```

> **Read:** https://typeorm.io/entities#column-options

### Step 4 — Write the TypeORM Migration

**File (new):** `backend/services/auth/src/database/migrations/1743000000000-AddOAuthColumns.ts`

Never edit a migration that has already been run — always write a new one. `up()` applies the change, `down()` reverts it.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthColumns1743000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "auth"."oauth_provider_enum" AS ENUM ('local', 'google', '42')
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ALTER COLUMN "passwordHash" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ADD COLUMN "email"         VARCHAR(255) UNIQUE,
        ADD COLUMN "oauthProvider" "auth"."oauth_provider_enum" NOT NULL DEFAULT 'local',
        ADD COLUMN "oauthId"       VARCHAR(255)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        DROP COLUMN "oauthId",
        DROP COLUMN "oauthProvider",
        DROP COLUMN "email"
    `);
    await queryRunner.query(`
      ALTER TABLE "auth"."users"
        ALTER COLUMN "passwordHash" SET NOT NULL
    `);
    await queryRunner.query(`DROP TYPE "auth"."oauth_provider_enum"`);
  }
}
```

Register it in `data-source.ts` migrations array, then run:
```bash
npm run migration:run
```

> **Read:** https://typeorm.io/migrations

### Step 5 — Add `findOrCreateOAuthUser` to UsersService

**File:** `backend/services/auth/src/users/users.service.ts`

The `findOrCreate` pattern is central to OAuth. When a user arrives via callback, three cases exist:

1. **Known by `oauthId + oauthProvider`** → returning OAuth user, return them
2. **Known by email** → account linking. An existing local account with the same email gets the OAuth identity attached. Safe for Google (emails are verified). Skip this step for providers with unverified emails.
3. **Neither** → new user, create with `passwordHash: null`

```typescript
export interface OAuthProfile {
  oauthId: string;
  oauthProvider: OAuthProvider;
  email: string | null;
  username: string;
}

async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
  // Case 1: returning OAuth user
  const byOAuthId = await this.usersRepository.findOneBy({
    oauthId: profile.oauthId,
    oauthProvider: profile.oauthProvider,
  });
  if (byOAuthId) return byOAuthId;

  // Case 2: account linking by email
  if (profile.email) {
    const byEmail = await this.usersRepository.findOneBy({ email: profile.email });
    if (byEmail) {
      byEmail.oauthId = profile.oauthId;
      byEmail.oauthProvider = profile.oauthProvider;
      return this.usersRepository.save(byEmail);
    }
  }

  // Case 3: new user
  const user = this.usersRepository.create({
    username: profile.username,
    email: profile.email,
    oauthId: profile.oauthId,
    oauthProvider: profile.oauthProvider,
    passwordHash: null,
  });
  return this.usersRepository.save(user);
}
```

Also add a null guard in the existing `validateUser`:
```typescript
async validateUser(username: string, password: string) {
  const user = await this.usersService.findByUsername(username);
  if (!user || !user.passwordHash) return null;  // add !user.passwordHash
  // ... rest of bcrypt.compare logic
}
```
Without this, calling `bcrypt.compare` with `null` as the hash throws.

### Step 6 — Create GoogleStrategy

**File (new):** `backend/services/auth/src/auth/strategies/google.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { OAuthProvider } from '../../users/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService, private usersService: UsersService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    // By the time validate() runs, Passport has already:
    //   1. Redirected user to Google
    //   2. Received the code at the callback URL
    //   3. Exchanged code for tokens server-to-server
    // Your only job: given this verified profile, return the user.
    return this.usersService.findOrCreateOAuthUser({
      oauthId: profile.id,                        // Google's stable `sub`
      oauthProvider: OAuthProvider.GOOGLE,
      email: profile.emails?.[0]?.value ?? null,
      username: `google_${profile.id}`,
    });
  }
}
```

> **Read:** https://github.com/jaredhanson/passport-google-oauth2#configure-strategy

### Step 7 — Create GoogleAuthGuard

**File (new):** `backend/services/auth/src/auth/guards/google-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
```

### Step 8 — Add OAuth Endpoints to AuthController

**File:** `backend/services/auth/src/auth/auth.controller.ts`

```typescript
@Get('google')
@UseGuards(GoogleAuthGuard)
@ApiOperation({ summary: 'Initiate Google OAuth2 flow' })
googleLogin() {
  // Guard redirects to Google — this body never executes
}

@Get('google/callback')
@UseGuards(GoogleAuthGuard)
@ApiOperation({ summary: 'Google OAuth2 callback — issues JWT' })
googleCallback(@Request() req) {
  // req.user is populated by GoogleStrategy.validate()
  // authService.login() is the same function used by local auth
  return this.authService.login(req.user);
}
```

### Step 9 — Register in AuthModule

**File:** `backend/services/auth/src/auth/auth.module.ts`

```typescript
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Module({
  providers: [
    AuthService,
    LocalStrategy, LocalAuthGuard,
    JwtStrategy,
    GoogleStrategy,    // add
    GoogleAuthGuard,   // add
  ],
})
export class AuthModule {}
```

Without adding `GoogleStrategy` to `providers`, the DI container never instantiates it and `AuthGuard('google')` fails with `Unknown authentication strategy 'google'`.

**Critical gotcha — session error:** Add `session: false` in the `super()` call inside `GoogleStrategy`:
```typescript
super({
  // ...
  session: false,  // your app is stateless, no session middleware
});
```
Or set `PassportModule.register({ session: false })` in AuthModule. Without this you get `Error: Failed to serialize user into session`.

### Step 10 — Manual End-to-End Test

1. Start: `npm run start:dev`
2. Browser → `http://localhost:4001/auth/google`
3. Google consent screen → authorize
4. Response: `{ "access_token": "eyJ..." }`
5. Decode at https://jwt.io — `sub` is a UUID, `username` is `google_XXXXX`
6. DB: `SELECT * FROM auth.users` — row with `oauthProvider = 'google'`, `passwordHash = NULL`

**Common errors at this step:**

| Error | Cause |
|-------|-------|
| `redirect_uri_mismatch` | URL in `GOOGLE_CALLBACK_URL` doesn't exactly match Google Cloud Console |
| `Unknown authentication strategy 'google'` | `GoogleStrategy` not in AuthModule providers |
| `InternalOAuthError` | Wrong `clientSecret` |
| `Failed to serialize user into session` | Missing `session: false` |

---

## Phase 2 — 42 School OAuth2

Same pattern as Phase 1. The only differences are the npm package, the provider registration URL, and the profile shape.

### Step 11 — Install + Type Shim

```bash
npm install passport-42
```

If `@types/passport-42` doesn't exist, create `src/@types/passport-42.d.ts`:
```typescript
declare module 'passport-42' {
  import { Strategy as OAuth2Strategy } from 'passport-oauth2';
  export class Strategy extends OAuth2Strategy {
    constructor(options: any, verify: Function);
    name: string;
  }
}
```

### Step 12 — Register the 42 Application

1. https://profile.intra.42.fr/oauth/applications → New Application
2. Redirect URI: `http://localhost:4001/auth/42/callback`
3. Copy UID (client ID) and Secret

Add to `.env`:
```
FT_CLIENT_ID=your_uid
FT_CLIENT_SECRET=your_secret
FT_CALLBACK_URL=http://localhost:4001/auth/42/callback
```

> **Read:** https://api.intra.42.fr/apidoc/guides/getting_started

### Step 13 — Create School42Strategy

**File (new):** `backend/services/auth/src/auth/strategies/school42.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';
import { OAuthProvider } from '../../users/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class School42Strategy extends PassportStrategy(Strategy, '42') {
  constructor(config: ConfigService, private usersService: UsersService) {
    super({
      clientID: config.getOrThrow<string>('FT_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('FT_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('FT_CALLBACK_URL'),
      session: false,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // Log profile during development — 42's profile shape is non-standard
    console.log('42 profile:', JSON.stringify(profile, null, 2));

    return this.usersService.findOrCreateOAuthUser({
      oauthId: String(profile.id),
      oauthProvider: OAuthProvider.SCHOOL42,
      email: profile.emails?.[0]?.value ?? null,
      username: `42_${profile.id}`,
    });
  }
}
```

### Step 14 — Guard + Endpoints + Module Registration

**Guard** (`backend/services/auth/src/auth/guards/school42-auth.guard.ts`):
```typescript
@Injectable()
export class School42AuthGuard extends AuthGuard('42') {}
```

**Endpoints** (add to `auth.controller.ts`):
```typescript
@Get('42')
@UseGuards(School42AuthGuard)
school42Login() {}

@Get('42/callback')
@UseGuards(School42AuthGuard)
school42Callback(@Request() req) {
  return this.authService.login(req.user);
}
```

**AuthModule** — add `School42Strategy` and `School42AuthGuard` to `providers`.

---

## Phase 3 — API Gateway JWT Guard

### Concept: The Token Translation Boundary

The API Gateway (port 4000) is the single entry point for all clients. It validates JWTs before forwarding requests to downstream services. Downstream services receive trusted identity headers (`X-User-Id`) instead of raw JWTs — they don't need to know anything about JWT validation.

Outside the gateway: requests carry JWTs.
Inside the internal network: requests carry verified identity headers.

> **Read:** https://microservices.io/patterns/security/access-token.html

### Step 15 — Install JWT/Passport in the Gateway

```bash
cd backend/api/transcendence-api-gateway
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt
```

### Step 16 — Create JwtStrategy in the Gateway

**File (new):** `backend/api/transcendence-api-gateway/src/auth/jwt.strategy.ts`

The gateway only **validates** tokens — it never issues them.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  validate(payload: { sub: string; username: string }) {
    return { id: payload.sub, username: payload.username };
  }
}
```

`JWT_SECRET` in the gateway's `.env` must be the same value as in the auth service's `.env`.

### Step 17 — Create JwtAuthGuard in the Gateway

**File (new):** `backend/api/transcendence-api-gateway/src/auth/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### Step 18 — Create GatewayAuthModule

**File (new):** `backend/api/transcendence-api-gateway/src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class GatewayAuthModule {}
```

Import `GatewayAuthModule` in the gateway's `AppModule`.

### Step 19 — Apply the Guard to Protected Routes

```typescript
@Get('some-resource')
@UseGuards(JwtAuthGuard)
getResource(@Request() req) {
  // req.user = { id, username } — verified identity
  // Forward to downstream service with X-User-Id header
}
```

Add `JWT_SECRET` to the gateway's `.env`.

---

## Implementation Order

```
Phase 0: Read RFC 6749 + NestJS Passport docs
    |
    +-- Step 1  npm install passport-google-oauth20
    +-- Step 2  Google Cloud Console registration         (parallel)
    |
    Step 3  Extend User entity
    Step 4  Write + run migration
    Step 5  findOrCreateOAuthUser + validateUser null guard
    Steps 6–9  GoogleStrategy, GoogleAuthGuard, endpoints, AuthModule
    Step 10  Manual E2E test                             (DO NOT SKIP)
    Steps 11–14  42 OAuth (mirrors Phase 1 exactly)
    Steps 15–19  Gateway JWT guard                       (independent)
```

---

## Critical Files

| File | Change |
|------|--------|
| `backend/services/auth/src/users/user.entity.ts` | Add `OAuthProvider` enum + 3 new columns |
| `backend/services/auth/src/database/migrations/1743000000000-AddOAuthColumns.ts` | New migration |
| `backend/services/auth/src/database/data-source.ts` | Register new migration |
| `backend/services/auth/src/users/users.service.ts` | Add `findOrCreateOAuthUser` + null guard |
| `backend/services/auth/src/auth/auth.service.ts` | Add null guard in `validateUser` |
| `backend/services/auth/src/auth/auth.module.ts` | Register new strategies/guards |
| `backend/services/auth/src/auth/auth.controller.ts` | Add 4 OAuth endpoints |
| `backend/services/auth/src/auth/strategies/google.strategy.ts` | New file |
| `backend/services/auth/src/auth/strategies/school42.strategy.ts` | New file |
| `backend/services/auth/src/auth/guards/google-auth.guard.ts` | New file |
| `backend/services/auth/src/auth/guards/school42-auth.guard.ts` | New file |
| `backend/api/transcendence-api-gateway/src/auth/` | New directory (3 files) |

---

## Verification Checklist

- [ ] **Google flow:** Browser → `/auth/google` → Google consent → response contains `access_token` → decode at jwt.io: `sub` is UUID, `username` is `google_XXXXX` → DB row has `oauthProvider='google'`, `passwordHash=NULL`
- [ ] **42 flow:** Same sequence with `/auth/42`
- [ ] **Account linking:** Register locally with an email, then OAuth login with same email → same user row, `oauthId` now populated
- [ ] **Duplicate OAuth login:** Login with Google twice → only one DB row (no duplicate on second login)
- [ ] **OAuth user blocked from local login:** `POST /auth/login` with a Google account's username → 401
- [ ] **Gateway guard:** Protected gateway route without token → 401; with valid token → 200
