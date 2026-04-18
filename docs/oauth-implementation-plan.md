# OAuth Implementation Plan

## Goal

Add Google OAuth login, keep the OAuth contracts provider-generic for future providers such as 42, then validate the issued application JWT at the API gateway.

This plan is implementation-focused. It assumes the current auth service remains the source of user identity and token issuance.

## Current Repo Constraints

- Auth service path: `backend/services/auth`
- Gateway path: `backend/api/transcendence-api-gateway`
- Existing users table has `username VARCHAR(20) NOT NULL UNIQUE`
- Existing local registration has no email field
- Existing auth service already issues app JWTs through `AuthService.login()`
- Existing app module and TypeORM CLI data source both register migrations explicitly

## Target Behavior

- `GET /auth/google` starts Google OAuth.
- `GET /auth/google/callback` completes Google OAuth for the frontend flow and redirects to the frontend.
- `GET /auth/google/callback/test` completes Google OAuth for backend testing and returns JSON.
- OAuth users are stored with `passwordHash = null`.
- OAuth users cannot log in through username/password.
- OAuth users cannot change password.
- OAuth users remain OAuth-only until the account is deleted.
- Duplicate OAuth logins reuse the same user row.
- Local and OAuth accounts are not linked in this implementation.
- Email is required and unique for both local and OAuth users.
- Gateway-protected routes reject missing/invalid JWTs and accept valid auth-service JWTs.

## Phase 1: Auth Service Schema

### 1.1 Update User Entity

File: `backend/services/auth/src/users/user.entity.ts`

Add:

- `OAuthProvider` enum: `local`, `google`, `42`
- nullable `passwordHash`
- unique `email`
- `oauthProvider` with default `local`
- nullable `oauthId`

Also increase the username column length. The current `VARCHAR(20)` is too short for generated OAuth usernames. Use `VARCHAR(100)`.

Recommended entity shape:

```ts
export enum OAuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  SCHOOL42 = '42',
}

@Column({ length: 100, unique: true })
username: string;

@Column({ nullable: true })
passwordHash: string | null;

@Column({ length: 255, unique: true })
email: string;

@Column({ type: 'enum', enum: OAuthProvider, default: OAuthProvider.LOCAL })
oauthProvider: OAuthProvider;

@Column({ length: 255, nullable: true })
oauthId: string | null;
```

### 1.2 Create OAuth Migration

New file:

`backend/services/auth/src/database/migrations/<timestamp>-AddOAuthColumns.ts`

Migration must:

- create enum type `auth.oauth_provider_enum`
- alter `auth.users.passwordHash` to nullable
- alter `auth.users.username` from `VARCHAR(20)` to `VARCHAR(100)`
- add `email VARCHAR(255) NOT NULL UNIQUE`
- add `oauthProvider` defaulting to `local`
- add nullable `oauthId`
- add a unique composite index on `(oauthProvider, oauthId)`

Important migration prerequisite:

- If the development database has no existing users, adding `email NOT NULL` is straightforward.
- If existing users exist, the migration backfills them with deterministic `@legacy.local` emails before applying `NOT NULL`.
- Those backfilled emails are migration compatibility data. New registration requires a real email.

Use a partial unique index so multiple local users with `oauthId = NULL` do not conflict:

```sql
CREATE UNIQUE INDEX "IDX_users_oauth_provider_oauth_id"
ON "auth"."users" ("oauthProvider", "oauthId")
WHERE "oauthId" IS NOT NULL
```

Why this index exists:

- The application will search by `(oauthProvider, oauthId)` on every OAuth login.
- The database must enforce that one Google account maps to only one local user.
- Without this constraint, two concurrent first-time OAuth callbacks for the same Google account can both see "no user found" and insert duplicate users.

Alternatives:

- Add `UNIQUE(oauthId)` only. This is simpler, but weaker for future providers because different providers could theoretically use the same ID value.
- Store provider identities in a separate `oauth_identities` table with `provider`, `providerUserId`, and `userId`. This is cleaner for many providers or account linking, but more complex than needed for this Google-first implementation.
- Rely only on application-level lookup. This is not recommended because it does not protect against races or manual DB writes.

The `down()` migration must reverse these changes in dependency order:

1. drop OAuth unique index
2. drop OAuth columns
3. restore `passwordHash NOT NULL`
4. restore `username VARCHAR(20)`
5. drop enum type

Before restoring `passwordHash NOT NULL`, the down migration may fail if OAuth users exist. Before dropping `email`, the down migration may also need to account for local users created after the email column was added. That is acceptable for development migrations, but document it in the migration comment if desired.

### 1.3 Register Migration in Both Places

Update both:

- `backend/services/auth/src/database/data-source.ts`
- `backend/services/auth/src/app.module.ts`

Both currently list migrations explicitly. If only one is updated, CLI migration runs and app startup migrations can diverge.

## Phase 2: Require Email for Local Registration

Email should be required for local registration. This keeps identity rules consistent:

- local users have `email + passwordHash`
- OAuth users have `email + oauthProvider + oauthId`
- email is unique across all users
- one email cannot create both a local and an OAuth account

This is stricter than the current implementation, but simpler. The alternative is keeping local email optional, which means OAuth cannot use email as a reliable conflict check against existing local users.

### 2.1 Update Register DTO

File: `backend/services/auth/src/auth/dto/register.dto.ts`

Add required email.

```ts
@IsEmail()
@MaxLength(255)
email: string;
```

### 2.2 Update UsersService.create

File: `backend/services/auth/src/users/users.service.ts`

Accept `email: string`.

Add duplicate handling for email unique constraint. Preserve existing username conflict handling.

### 2.3 Update AuthService.register

File: `backend/services/auth/src/auth/auth.service.ts`

Pass `dto.email` into `UsersService.create`.

## Phase 3: OAuth User Lookup

### 3.1 Add OAuthProfile Contract

File: `backend/services/auth/src/users/users.service.ts`

Add a provider-generic contract:

```ts
export interface OAuthProfile {
  oauthId: string;
  oauthProvider: OAuthProvider;
  email: string;
  username: string;
}
```

Use an interface here, not a class. This object is internal service input, not a request DTO, response DTO, entity, or dependency-injected provider. NestJS class benefits such as validation decorators, transformation, Swagger metadata, and runtime reflection do not apply here unless the object crosses a Nest request boundary. If this later becomes an API DTO, convert it to a class.

### 3.2 Add findOrCreateOAuthUser

File: `backend/services/auth/src/users/users.service.ts`

Implementation order:

1. Find by `(oauthProvider, oauthId)`.
2. If no OAuth identity is found, check whether `email` already exists.
3. If email exists on any other user, reject the login with a conflict-style error. Do not link accounts in this implementation.
4. Create a new OAuth user with `passwordHash: null`.

Provider rules:

- Google OAuth must provide a verified email. If Google does not provide a verified email, reject the login.
- Keep the service contract generic enough for 42 later, but do not implement 42 OAuth logic in this pass.

### 3.3 Generate Safe Usernames

Do not use raw `google_${profile.id}` if it exceeds the DB username length.

Recommended helper:

```ts
function oauthUsername(provider: OAuthProvider, oauthId: string): string {
  return `${provider}_${oauthId}`.slice(0, 100);
}
```

If collisions occur, append a short suffix and retry. The DB unique constraint remains the final authority.

## Phase 4: Auth Service Password Guards

### 4.1 Guard Local Login Against OAuth Users

File: `backend/services/auth/src/auth/auth.service.ts`

Update `validateUser`:

```ts
if (!user || !user.passwordHash) return null;
```

### 4.2 Permanently Block Password Change for OAuth Users

File: `backend/services/auth/src/auth/auth.service.ts`

Before `bcrypt.compare`, add:

```ts
if (!user.passwordHash) {
  throw new BadRequestException('OAuth accounts cannot change password');
}
```

Do not add a "set password" path for OAuth users in this implementation.

## Phase 5: Google OAuth

### 5.1 Install Dependencies

Path: `backend/services/auth`

```bash
npm install passport-google-oauth20
npm install --save-dev @types/passport-google-oauth20
```

### 5.2 Environment Variables

Auth service `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4001/auth/google/callback
GOOGLE_TEST_CALLBACK_URL=http://localhost:4001/auth/google/callback/test
FRONTEND_OAUTH_SUCCESS_URL=http://localhost:3000/auth/callback
```

`FRONTEND_OAUTH_SUCCESS_URL` is where the auth service sends the browser after Google login succeeds.

OAuth is browser-based. The user starts at the app, gets redirected to Google, then Google redirects back to the auth service. At that point, the auth service has created/found the user and issued the app JWT. The auth service then needs a final browser destination. That destination is the frontend OAuth success URL.

Example final redirect:

```text
Google -> http://localhost:4001/auth/google/callback -> http://localhost:3000/auth/callback
```

Use a separate test callback for backend-only verification:

```text
Google -> http://localhost:4001/auth/google/callback/test -> JSON response
```

Google requires every callback URL to be registered exactly in the Google Cloud OAuth app. Register both URLs during development:

- `http://localhost:4001/auth/google/callback`
- `http://localhost:4001/auth/google/callback/test`

### 5.3 Add Google Strategy

New file:

`backend/services/auth/src/auth/strategies/google.strategy.ts`

Requirements:

- use Passport strategy name `google`
- request scopes `email` and `profile`
- get client settings from `ConfigService`
- call `UsersService.findOrCreateOAuthUser`
- require Google to provide a verified email
- reject login if another user already owns that email

Use `PassportModule.register({ session: false })` in `AuthModule`. Keep OAuth state handling explicit; do not assume session-backed state protection works in a stateless service without verifying it.

### 5.4 Add Google Guard

New file:

`backend/services/auth/src/auth/guards/google-auth.guard.ts`

```ts
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
```

### 5.5 Add Google Routes

File: `backend/services/auth/src/auth/auth.controller.ts`

Add:

- `GET /auth/google`
- `GET /auth/google/test`
- `GET /auth/google/callback`
- `GET /auth/google/callback/test`

`GET /auth/google` starts the real frontend flow.

`GET /auth/google/test` starts the backend-test flow. It must pass the test callback URL to Google, so Google returns to `/auth/google/callback/test`.

The backend-test callback returns `{ access_token }` directly.

That means if you open `http://localhost:4001/auth/google/test` in the browser and finish Google login, the test callback route responds with plain JSON:

```json
{ "access_token": "..." }
```

This is useful to prove the backend works without involving frontend storage or redirects. It is not used by the frontend app.

The real frontend callback should use a stateless handoff token:

1. Auth service completes Google OAuth.
2. Auth service issues the normal app JWT.
3. Auth service wraps that JWT in a short-lived, signed OAuth handoff token.
4. Auth service redirects to `FRONTEND_OAUTH_SUCCESS_URL?token=<handoffToken>`.
5. Frontend sends the handoff token to a backend exchange endpoint.
6. Backend validates the handoff token and returns the app JWT.

Do not put the app JWT itself in the redirect URL. The handoff token should expire quickly, for example after 60 seconds. This keeps the flow stateless while reducing the risk of exposing the long-lived app JWT in browser history, logs, or referrers.

Add an exchange endpoint:

- `POST /auth/oauth/exchange`

Request:

```json
{ "token": "<handoffToken>" }
```

Response:

```json
{ "access_token": "..." }
```

The handoff token can be signed with the same `JWT_SECRET` or a separate `OAUTH_HANDOFF_SECRET`. Prefer a separate `OAUTH_HANDOFF_SECRET` if configuration overhead is acceptable.

### 5.6 Register Providers

File: `backend/services/auth/src/auth/auth.module.ts`

Add:

- `GoogleStrategy`
- `GoogleAuthGuard`
- `PassportModule.register({ session: false })`

## Phase 6: Future Provider Readiness

Do not implement 42 OAuth in this pass.

Keep these pieces provider-generic:

- `OAuthProvider` enum
- `OAuthProfile` interface
- `findOrCreateOAuthUser`
- OAuth username generation helper
- DB uniqueness on `(oauthProvider, oauthId)`

When 42 is implemented later, it should add only provider-specific strategy, guard, routes, env vars, and profile mapping.

## Phase 7: OAuth State and Callback Security

OAuth `state` prevents login CSRF.

The problem it solves:

1. User clicks `GET /auth/google`.
2. Server generates a random `state` value and sends the browser to Google with that state.
3. Google sends the browser back to `/auth/google/callback?code=...&state=...`.
4. Server verifies the returned state is the same one it created.

If the callback state is missing or wrong, the request is rejected.

Before considering OAuth complete, choose and implement one state strategy:

1. Session-backed Passport state with session middleware.
2. Signed, short-lived state cookie.
3. Server-side state store keyed by nonce.

Recommended for this project: signed, short-lived state cookie. It keeps the auth service stateless from a database/session perspective and still gives the callback something to verify.

Acceptance criteria:

- callback with missing state fails
- callback with mismatched state fails
- callback with valid state succeeds

Implementation expectation:

- `/auth/google` creates random state.
- `/auth/google` stores the state in a signed, short-lived, HTTP-only cookie.
- `/auth/google` sends the same state to Google.
- `/auth/google/callback` compares Google returned state with the signed cookie state.
- callback clears the state cookie after success or failure.

If Passport strategy state is enabled instead, verify how the strategy stores state before relying on it. Some Passport state implementations assume sessions, which this service is not otherwise using.

## Phase 8: Gateway JWT Validation

### 8.1 Install Dependencies

Path: `backend/api/transcendence-api-gateway`

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt
```

### 8.2 Add Gateway Auth Module

New files:

- `backend/api/transcendence-api-gateway/src/auth/auth.module.ts`
- `backend/api/transcendence-api-gateway/src/auth/jwt.strategy.ts`
- `backend/api/transcendence-api-gateway/src/auth/jwt-auth.guard.ts`

The strategy validates tokens signed by the auth service. It does not issue tokens.

### 8.3 Configure JWT Secret

Gateway `.env`:

```env
JWT_SECRET=same_value_as_auth_service
```

### 8.4 Import GatewayAuthModule

File:

`backend/api/transcendence-api-gateway/src/app.module.ts`

Add `GatewayAuthModule` to imports.

### 8.5 Apply Guard to Protected Gateway Routes

For protected routes:

```ts
@UseGuards(JwtAuthGuard)
```

Forward verified identity to downstream services through internal headers such as:

- `X-User-Id`
- `X-Username`

Do not forward unvalidated bearer tokens as trusted identity.

## Phase 9: Tests and Verification

### 9.1 Unit Tests

Auth service:

- `validateUser` returns null for OAuth user with `passwordHash = null`
- `changePassword` rejects OAuth user with `passwordHash = null`
- `findOrCreateOAuthUser` returns existing OAuth user
- `findOrCreateOAuthUser` creates new OAuth user
- `findOrCreateOAuthUser` rejects OAuth login if email belongs to another user
- duplicate username/email conflicts return expected exceptions

Gateway:

- missing bearer token returns 401
- invalid bearer token returns 401
- valid auth-service JWT populates `req.user`

### 9.2 Migration Verification

Run in auth service:

```bash
npm run migration:run
npm run build
npm test
```

Check DB:

```sql
\d auth.users
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'users';
```

### 9.3 Manual OAuth Verification

Google:

1. Start auth service.
2. Visit `http://localhost:4001/auth/google/test`.
3. Complete provider login.
4. Verify app JWT is returned as JSON.
5. Decode app JWT and confirm `sub` is local user UUID.
6. Confirm DB row has `oauthProvider = 'google'` and `passwordHash IS NULL`.
7. Repeat login and confirm no duplicate row.

Frontend OAuth:

1. Visit `http://localhost:4001/auth/google`.
2. Complete provider login.
3. Verify redirect to `FRONTEND_OAUTH_SUCCESS_URL` with a handoff token.
4. Call `POST /auth/oauth/exchange` with the handoff token.
5. Verify response contains app JWT.
6. Verify expired or malformed handoff token is rejected.

Gateway:

1. Call protected route with no token: expect 401.
2. Call with invalid token: expect 401.
3. Call with valid auth-service JWT: expect 200 and populated identity.

## Implementation Order

1. Schema/entity migration changes.
2. Required registration email support.
3. `findOrCreateOAuthUser`.
4. Login/password guards for nullable `passwordHash`.
5. Google OAuth strategy, guard, routes, module registration.
6. OAuth state solution.
7. OAuth handoff token and exchange endpoint.
8. Google manual verification through test route.
9. Google frontend redirect verification.
10. Gateway JWT module and protected route verification.
11. Full test/build pass.

## Remaining Decision Before Coding

- What final username format should OAuth users get if generated usernames collide?
