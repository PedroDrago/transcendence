# User Management Service

This is the `user-management` microservice for the Transcendence project. It handles user profiles, avatars, social connections (friendships), and privacy controls (blocking).

## Overview

The service is built with **NestJS**, **TypeORM**, and **PostgreSQL**, utilizing `class-validator` and `joi` for strict payload validation. It exposes a REST API for the frontend and internal modules (like Chat) to interact with user data and social graphs.

## Infrastructure & Configuration (Fail-Fast)
This service uses a *Fail-Fast* approach during boot. The container will abort initialization if any critical environment variables are missing from the `.env` file.

**Required Variables:**
- `PORT` (Default: 3002)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Architecture Notes
- All authenticated routes require the `x-user-id` header to identify the current user. This is typically injected by the API Gateway after JWT validation.
- The service uses strict isolation levels (`SERIALIZABLE`) for social graph mutations (friends and blocks) to prevent concurrency race conditions.

---

## API Endpoints

### 1. Users

Manage user profiles and avatars (including cascade deletion on the database).
- **Avatar Fallback:** If a user does not have an uploaded image, the system automatically defaults to serving `/users/avatars/default-avatar.png`.
- **Security Note (Data Leakage):** Listing endpoints omit sensitive data (e.g., `dateOfBirth`) during serialization to ensure privacy.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/users` | Create a new user profile. |
| `GET` | `/users/me` | Retrieve the authenticated user's profile. Requires `x-user-id`. |
| `PATCH` | `/users/me` | Update the authenticated user's profile (displayName, bio, etc). Requires `x-user-id`. |
| `PATCH` | `/users/me/avatar` | Upload a new avatar image (multipart/form-data). Requires `x-user-id`. |
| `GET` | `/users/avatars/:filename` | Serve a user's avatar image. |
| `GET` | `/users/:id` | Retrieve a specific user's public profile. Requires strict UUID v4 path parameter. |
| `DELETE` | `/users/:id` | Delete a user profile (cascades blocks and friendships). Requires strict UUID v4 path parameter. |

### 2. Friends

Complete state machine for managing social ties.
- Native prevention against self-requests and duplicate requests (both direct and reverse directions).
- **Data Recycling:** Rejected requests (`REJECTED`) are kept in the database for auditing but are recycled back to `PENDING` if the user attempts to reconnect.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/friends` | List all accepted friends for the authenticated user. Requires `x-user-id`. |
| `GET` | `/users/friends/requests` | List all pending incoming friend requests for the authenticated user. Requires `x-user-id`. |
| `POST` | `/users/friends/requests` | Send a friend request to another user. Body: `{ "addresseeId": "uuid" }`. Requires `x-user-id`. |
| `PATCH` | `/users/friends/requests/:id` | Respond to a friend request. Body: `{ "status": "ACCEPTED" \| "REJECTED" }`. Requires `x-user-id`. |
| `DELETE` | `/users/friends/:id` | Unfriend a user by deleting an accepted friendship. Requires strict UUID v4 path parameter. Requires `x-user-id`. |

### 3. Blocks

Guarantees social isolation and feeds the business rules for communication modules.
- Blocks are strictly unidirectional (`A blocks B`).
- **ACID Atomic Transactions:** When blocking a user, any active or pending friendship ties are **physically deleted** atomically in the database. This prevents circular dependencies with the friends module.
- Strict locks against *Race Conditions* (e.g., preventing the acceptance of stale invites from recently blocked users).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/blocks` | List all users blocked by the authenticated user. Requires `x-user-id`. |
| `POST` | `/users/blocks` | Block a user. Body: `{ "blockedId": "uuid" }`. Requires `x-user-id`. |
| `DELETE` | `/users/blocks/:blockedId` | Unblock a user. Requires `x-user-id`. |
| `GET` | `/users/blocks/:targetId/status` | Internal endpoint for the Chat module to check if an interaction is allowed. Returns `isBlocked: true` if a block exists in *either* direction. Requires `x-user-id`. |

---

## Inter-Service Communication

### Chat Module Integration
Before the Chat module allows users to exchange direct messages or join private channels, it must query the User Management service to verify they haven't blocked each other.

**Request:**
```http
GET /users/blocks/:targetId/status
x-user-id: <requester-uuid>
```

**Response:**
```json
{
  "blockedByMe": true,
  "blockedMe": false,
  "isBlocked": true
}
```
*Note: If `isBlocked` is `true`, the chat operation must be aborted.*

## QA & Automated Testing

To guarantee the resilience of the social engine, the service relies on an exhaustive end-to-end (E2E) test suite that verifies database constraints, UUID failures, atomic concurrency (race conditions), and data leakage protection.

```bash
# Install dependencies
npm install

# Run tests
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report

# Run database migrations
npm run migration:run
```
