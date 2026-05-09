# HTTP Client Testing Guide

This guide is for testing the current services with an HTTP client such as Bruno or Postman.

## Current Service Map

The stack exposes these HTTP services:

- Frontend: `http://localhost:3000`
- API gateway: `http://localhost:4000`
- Auth service: `http://localhost:4001`
- Chat service: `http://localhost:4002`
- User service: `http://localhost:3002`

Important:

- The gateway currently does not proxy downstream service routes yet.
- For now, test `auth-service`, `chat-service`, and `user-service` directly.
- `chat-service` expects `Authorization: Bearer <token>`.
- `user-service` currently expects `x-user-id: <uuid>`.

## Before You Start

Start the stack:

```bash
make up
```

## Suggested Client Variables

Create these variables in Bruno/Postman:

```text
frontend_base=http://localhost:3000
gateway_base=http://localhost:4000
auth_base=http://localhost:4001
chat_base=http://localhost:4002
user_base=http://localhost:3002

access_token=
user_id=
second_user_id=
conversation_id=
group_conversation_id=
avatar_filename=
```

## Recommended Test Order

1. Test health endpoints.
2. Register user A.
3. Login as user A and save `access_token`.
4. Register user B and save `second_user_id`.
5. Test user profile endpoints using `x-user-id` from user A.
6. Test chat endpoints using the bearer token from user A.

## 1. Gateway

### Health

- Method: `GET`
- URL: `{{gateway_base}}/health`

Expected response:

```json
{
  "status": "ok"
}
```

### Root

- Method: `GET`
- URL: `{{gateway_base}}/`

Expected response:

```text
Hello World!
```

## 2. Auth Service

Swagger is available in the browser at:

```text
http://localhost:4001/docs
```

### Health

- Method: `GET`
- URL: `{{auth_base}}/health`

Expected response:

```json
{
  "status": "ok"
}
```

### Register User A

- Method: `POST`
- URL: `{{auth_base}}/auth/register`
- Headers:

```text
Content-Type: application/json
```

- Body:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

Expected response shape:

```json
{
  "message": "registered",
  "user": {
    "id": "uuid-here",
    "username": "alice",
    "email": "alice@example.com",
    "oauthProvider": "local",
    "oauthId": null,
    "usernamePending": false,
    "createdAt": "2026-05-09T00:00:00.000Z",
    "updatedAt": "2026-05-09T00:00:00.000Z"
  }
}
```

Save:

- `user_id = response.user.id`

### Register User B

Use another account so you can test chat/group flows.

- Method: `POST`
- URL: `{{auth_base}}/auth/register`
- Headers:

```text
Content-Type: application/json
```

- Body:

```json
{
  "username": "bob",
  "email": "bob@example.com",
  "password": "supersecret123"
}
```

Save:

- `second_user_id = response.user.id`

### Login

- Method: `POST`
- URL: `{{auth_base}}/auth/login`
- Headers:

```text
Content-Type: application/json
```

- Body:

```json
{
  "identifier": "alice",
  "password": "supersecret123"
}
```

You can also log in with email:

```json
{
  "identifier": "alice@example.com",
  "password": "supersecret123"
}
```

Expected response:

```json
{
  "access_token": "jwt-token-here"
}
```

Save:

- `access_token = response.access_token`

### Change Password

- Method: `PATCH`
- URL: `{{auth_base}}/auth/password`
- Headers:

```text
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

- Body:

```json
{
  "currentPassword": "supersecret123",
  "newPassword": "supersecret456"
}
```

Success response:

- Status: `200`
- Empty body

After changing the password, log in again with the new password if you want to keep testing that account.

### Update Username

- Method: `PATCH`
- URL: `{{auth_base}}/auth/username`
- Headers:

```text
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

- Body:

```json
{
  "username": "alice_updated"
}
```

Expected response shape:

```json
{
  "message": "username updated",
  "access_token": "new-jwt-token-here",
  "user": {
    "id": "uuid-here",
    "username": "alice_updated",
    "email": "alice@example.com",
    "usernamePending": false,
    "createdAt": "2026-05-09T00:00:00.000Z",
    "updatedAt": "2026-05-09T00:00:00.000Z"
  }
}
```

Important:

- Replace `access_token` with the new token from this response.

### Exchange OAuth Handoff Token

Use this only if you already have a handoff token from the OAuth flow.

- Method: `POST`
- URL: `{{auth_base}}/auth/oauth/exchange`
- Headers:

```text
Content-Type: application/json
```

- Body:

```json
{
  "token": "oauth-handoff-token-here"
}
```

Expected response:

```json
{
  "access_token": "jwt-token-here"
}
```

### Google OAuth Endpoints

These are redirect-based browser flows, not normal JSON API calls:

- `GET {{auth_base}}/auth/google`
- `GET {{auth_base}}/auth/google/test`
- `GET {{auth_base}}/auth/google/callback`
- `GET {{auth_base}}/auth/google/callback/test`

Test those in a browser only after real Google credentials are configured in the root `.env`.

## 3. User Service

Important:

- This service currently identifies the caller with `x-user-id`.
- Use the UUID you got from auth registration.
- It does not currently use the bearer token directly.

### Health

- Method: `GET`
- URL: `{{user_base}}/health`

Expected response:

```json
{
  "status": "ok"
}
```

### Get My Profile

- Method: `GET`
- URL: `{{user_base}}/users/me`
- Headers:

```text
x-user-id: {{user_id}}
```

Expected response shape:

```json
{
  "id": "uuid-here",
  "username": "alice",
  "displayName": null,
  "bio": null,
  "avatarUrl": "/users/avatars/default-avatar.png",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z",
  "age": null
}
```

### Update My Profile

- Method: `PATCH`
- URL: `{{user_base}}/users/me`
- Headers:

```text
Content-Type: application/json
x-user-id: {{user_id}}
```

- Body:

```json
{
  "displayName": "Alice Example",
  "bio": "Testing the profile service",
  "dateOfBirth": "1998-04-12"
}
```

Expected response shape:

```json
{
  "id": "uuid-here",
  "username": "alice",
  "displayName": "Alice Example",
  "bio": "Testing the profile service",
  "avatarUrl": "/users/avatars/default-avatar.png",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z",
  "age": 28
}
```

### Upload My Avatar

- Method: `PATCH`
- URL: `{{user_base}}/users/me/avatar`
- Headers:

```text
x-user-id: {{user_id}}
```

- Body type: `multipart/form-data`
- Form field:

```text
avatar = <select a file>
```

Rules:

- Field name must be exactly `avatar`
- Allowed file types: JPEG, PNG, WebP
- Max size: 2 MB

Expected response shape:

```json
{
  "id": "uuid-here",
  "username": "alice",
  "displayName": "Alice Example",
  "bio": "Testing the profile service",
  "avatarUrl": "/users/avatars/uuid-here.webp",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z",
  "age": 28
}
```

Save:

- `avatar_filename = uuid-here.webp`

### Fetch an Avatar File

Default avatar:

- Method: `GET`
- URL: `{{user_base}}/users/avatars/default-avatar.png`

Uploaded avatar:

- Method: `GET`
- URL: `{{user_base}}/users/avatars/{{avatar_filename}}`

Expected behavior:

- Returns image bytes, not JSON

### Get Any User By ID

- Method: `GET`
- URL: `{{user_base}}/users/{{user_id}}`

Expected response:

```json
{
  "id": "uuid-here",
  "username": "alice",
  "displayName": "Alice Example",
  "bio": "Testing the profile service",
  "avatarUrl": "/users/avatars/default-avatar.png",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z",
  "age": 28
}
```

## 4. Chat Service

Important:

- Use the auth JWT here.
- The service expects:

```text
Authorization: Bearer {{access_token}}
```

- There is no `/health` route in chat right now.
- `GET /` returns the HTML chat page.
- Message sending is not exposed as an HTTP route at the moment. The HTTP API covers conversation/group/status reads and creation.

### Root Page

- Method: `GET`
- URL: `{{chat_base}}/`

Expected behavior:

- Returns HTML, not JSON

### Create or Get a Direct Conversation

- Method: `POST`
- URL: `{{chat_base}}/api/conversation`
- Headers:

```text
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

- Body:

```json
{
  "recipient_name": "bob"
}
```

Expected response shape:

```json
{
  "conversation_id": 1,
  "recipient_id": "uuid-of-bob",
  "recipient_name": "bob"
}
```

Save:

- `conversation_id = response.conversation_id`

### List My Conversations

- Method: `GET`
- URL: `{{chat_base}}/api/conversations`
- Headers:

```text
Authorization: Bearer {{access_token}}
```

Expected response shape:

```json
{
  "conversations": [
    {
      "conversation_id": 1,
      "type": "direct",
      "name": null,
      "last_message": {
        "body": null,
        "user_id": null,
        "inserted_at": null
      },
      "other_user_id": "uuid-of-bob",
      "other_user_name": "bob",
      "members": [
        {
          "user_id": "uuid-of-alice",
          "username": "alice",
          "role": "member"
        },
        {
          "user_id": "uuid-of-bob",
          "username": "bob",
          "role": "member"
        }
      ]
    }
  ]
}
```

### List Messages for a Conversation

- Method: `GET`
- URL: `{{chat_base}}/api/messages?conversation_id={{conversation_id}}`
- Headers:

```text
Authorization: Bearer {{access_token}}
```

Expected response shape:

```json
{
  "messages": []
}
```

If messages exist, each item looks like:

```json
{
  "body": "hello",
  "user_id": "uuid-here",
  "inserted_at": "2026-05-09T00:00:00Z"
}
```

### Create a Group Conversation

- Method: `POST`
- URL: `{{chat_base}}/api/group`
- Headers:

```text
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

- Body:

```json
{
  "name": "Study Group",
  "member_ids": [
    "{{second_user_id}}"
  ]
}
```

Expected response:

```json
{
  "conversation_id": 2,
  "name": "Study Group"
}
```

Save:

- `group_conversation_id = response.conversation_id`

### Add a Member to a Group

- Method: `POST`
- URL: `{{chat_base}}/api/group/{{group_conversation_id}}/members`
- Headers:

```text
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

- Body:

```json
{
  "new_member_id": "{{second_user_id}}"
}
```

Expected success response:

```json
{
  "ok": true
}
```

### Remove a Member from a Group

- Method: `DELETE`
- URL: `{{chat_base}}/api/group/{{group_conversation_id}}/members/{{second_user_id}}`
- Headers:

```text
Authorization: Bearer {{access_token}}
```

Expected response:

```json
{
  "ok": true
}
```

### Rename a Group

- Method: `PATCH`
- URL: `{{chat_base}}/api/group/{{group_conversation_id}}`
- Headers:

```text
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

- Body:

```json
{
  "name": "Study Group Renamed"
}
```

Expected response:

```json
{
  "ok": true,
  "name": "Study Group Renamed"
}
```

### List Online Users

- Method: `GET`
- URL: `{{chat_base}}/api/users/online`
- Headers:

```text
Authorization: Bearer {{access_token}}
```

Expected response:

```json
{
  "online": []
}
```

### Get Last Seen for a User

- Method: `GET`
- URL: `{{chat_base}}/api/users/{{second_user_id}}/last_seen`
- Headers:

```text
Authorization: Bearer {{access_token}}
```

Expected response:

```json
{
  "last_seen_at": null
}
```

If the service has recorded activity for that user:

```json
{
  "last_seen_at": "2026-05-09T14:00:00Z"
}
```

## Common Error Cases

### Auth service

- `400 Bad Request`: invalid body, weak/short fields, same password as current
- `401 Unauthorized`: bad login credentials, invalid bearer token
- `403 Forbidden`: wrong current password on password change
- `409 Conflict`: username or email already exists

### User service

- `400 Bad Request`: missing `x-user-id`, missing avatar file
- `404 Not Found`: user or avatar does not exist
- `413 Payload Too Large`: avatar is larger than 2 MB
- `415 Unsupported Media Type`: avatar is not JPEG, PNG, or WebP

### Chat service

- `401 Unauthorized`: missing or malformed bearer token
- `403 Forbidden`: trying to read/update a conversation you do not control
- `404 Not Found`: direct conversation target username not found
- `422 Unprocessable Entity`: invalid group creation payload

## Minimal Smoke Test Set

If you only want a quick smoke test, run these requests:

1. `GET {{gateway_base}}/health`
2. `GET {{auth_base}}/health`
3. `POST {{auth_base}}/auth/register`
4. `POST {{auth_base}}/auth/login`
5. `GET {{user_base}}/health`
6. `GET {{user_base}}/users/me` with `x-user-id`
7. `GET {{chat_base}}/`
8. `POST {{chat_base}}/api/conversation` with bearer token
9. `GET {{chat_base}}/api/conversations` with bearer token

## Notes for Automation

Useful values to extract into client variables after requests:

- From auth register:

```text
user_id = response.user.id
second_user_id = response.user.id
```

- From auth login:

```text
access_token = response.access_token
```

- From chat create conversation:

```text
conversation_id = response.conversation_id
```

- From chat create group:

```text
group_conversation_id = response.conversation_id
```

If you want, I can also turn this into:

- a Bruno collection layout
- a Postman collection JSON
- or both
