# Transcendence
## Version 19.0

Microservices study project for a social network.

## Stack Startup

This repository now has a single source of truth for local infrastructure:

- `compose.yml`
- `ops/init.sh` (Auto-configures environments and self-signed SSL certificates)
- `Makefile`

Start the full stack with:

```bash
make up
```

Run it in the background with:

```bash
make up-d
```

Stop everything with:

```bash
make down
```

Remove containers and volumes with:

```bash
make clean
```

Deep clean (removes volumes, all images, prunes the system, and deletes generated `.env` files and SSL certificates):

```bash
make fclean
```

## Architecture & Services

Per the project requirements, **all external connections must be secure (HTTPS)**. We use **Nginx** as a reverse proxy to handle SSL termination and route traffic.

- Frontend App: `https://localhost`
- API Gateway: `https://localhost:8443`

> **Note:** Because we use self-signed certificates locally, your browser will display a security warning. You must proceed past this warning (e.g., clicking "Advanced" -> "Proceed to localhost").

### Dynamic Ports Setup

If you need to run the application on different ports locally without modifying the codebase, you can pass environment variables to `make`:

```bash
HTTPS_PORT=4443 API_HTTPS_PORT=9443 make up
```

This will automatically configure the Nginx proxy, generate the appropriate CORS rules, and build the Next.js frontend to communicate with the correct API port.

### External Integrations (Google OAuth & Cloudflare R2)

For security reasons, external credentials like Google OAuth and Cloudflare R2 keys are not stored in the repository. The application will start successfully without them (using local MinIO for storage and disabling the "Continue with Google" button).

If you want to run the application with these integrations enabled, you have three options:

**Option 1: Interactive Prompt (First Run Only)**
If you run `make up` on a fresh start (without `.env` files), the initialization script will pause and interactively ask you for the `GOOGLE_CLIENT_ID` and Cloudflare R2 credentials. You can paste them into the terminal, or simply press Enter to skip them and use the local defaults.

**Option 2: Pass them inline when running make (Automated setups)**
You can provide all keys simultaneously when starting the application:
```bash
GOOGLE_CLIENT_ID="your_google_client_id" \
GOOGLE_CLIENT_SECRET="your_google_secret" \
R2_ACCESS_KEY_ID="your_r2_access_key" \
R2_SECRET_ACCESS_KEY="your_r2_secret_key" \
R2_ENDPOINT="https://your_endpoint.r2.cloudflarestorage.com" \
R2_BUCKET="your_bucket_name" \
make up
```

**Option 3: Edit the generated environment files manually**
If the stack is already running, you can manually edit the `.env` files and restart the respective services:

1. For Google OAuth, edit `backend/services/auth/.env`:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_secret
   ```
   Then run: `docker compose up -d --build auth-service`

2. For Cloudflare R2, edit `backend/services/posts/.env` and `backend/services/user-management/.env` to include the R2 variables, then run:
   ```bash
   docker compose up -d --build posts-service user-service
   ```

> **Important for Google Cloud Console:** Ensure your OAuth credentials in Google Cloud have the exact Authorized JavaScript Origins (`https://localhost:443`, etc.) and the precise Authorized Redirect URIs matching your API port (`https://localhost:8443/auth/google/callback`).

### Published Services (External)

Only the **Nginx Reverse Proxy** is exposed to the host machine to ensure all external traffic is forced through HTTPS:

- Nginx (Frontend Proxy): `https://localhost:443` -> routes to `frontend:3000`
- Nginx (Gateway Proxy): `https://localhost:8443` -> routes to `gateway:4000`

### Internal Network (Isolated)

Application services and infrastructure stay on the internal Docker network (`transcendence-internal`) and are completely isolated from the outside world:

- Frontend: `http://frontend:3000`
- API Gateway: `http://gateway:4000`
- Auth service: `http://auth-service:4001`
- Chat service: `http://chat-service:4002`
- User service: `http://user-service:3002`
- Posts service: `http://posts-service:3333`
- PostgreSQL: `database:5432`
- Redis: `redis:6379`
- MinIO API: `http://minio:9000`
- MinIO console: `http://minio:9001`
- Jaeger UI: `http://jaeger:16686`

## Database Layout

All services share one PostgreSQL instance. Isolation happens by schema:

- `auth`
- `chat`
- `posts`
- `user_management`

The bootstrap SQL at `ops/init.sql` creates the required extensions and schemas before the application services start.
