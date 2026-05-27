# User Management Service

This is the `user-management` microservice for the Transcendence project. It handles user profiles, avatars, social connections (friendships), and privacy controls (blocking).

## Overview

The service is built with **NestJS**, **TypeORM**, and **PostgreSQL**. It exposes a REST API for the frontend and internal modules (like Chat) to interact with user data and social graphs.

### Architecture Notes
- All authenticated routes require the `x-user-id` header to identify the current user. This is typically injected by the API Gateway after JWT validation.
- The service uses strict isolation levels (`SERIALIZABLE`) for social graph mutations (friends and blocks) to prevent concurrency race conditions.

---

## API Endpoints

### 1. Users

Manage user profiles and avatars.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/users` | Create a new user profile. |
| `GET` | `/users/me` | Retrieve the authenticated user's profile. Requires `x-user-id`. |
| `PATCH` | `/users/me` | Update the authenticated user's profile (displayName, bio, etc). Requires `x-user-id`. |
| `PATCH` | `/users/me/avatar` | Upload a new avatar image (multipart/form-data). Requires `x-user-id`. |
| `GET` | `/users/avatars/:filename` | Serve a user's avatar image. |
| `GET` | `/users/:id` | Retrieve a specific user's public profile by UUID. |
| `DELETE` | `/users/:id` | Delete a user profile (cascades blocks and friendships). |

### 2. Friends

Manage social connections.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/friends` | List all accepted friends for the authenticated user. Requires `x-user-id`. |
| `GET` | `/users/friends/requests` | List all pending incoming friend requests for the authenticated user. Requires `x-user-id`. |
| `POST` | `/users/friends/requests` | Send a friend request to another user. Body: `{ "addresseeId": "uuid" }`. Requires `x-user-id`. |
| `PATCH` | `/users/friends/requests/:id` | Respond to a friend request. Body: `{ "status": "ACCEPTED" \| "REJECTED" }`. Requires `x-user-id`. |

### 3. Blocks

Manage privacy controls. Blocking a user immediately and transactionally destroys any existing friendship or pending requests between the two users.

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

## Development Setup

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
