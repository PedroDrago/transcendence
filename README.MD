# Transcendence
## Version 19.0

Microservices study project for a social network.

## Stack Startup

This repository now has a single source of truth for local infrastructure:

- `compose.yml`
- `.env`
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

## Services

- Frontend: `http://localhost:3000`
- API gateway: `http://localhost:4000`
- Auth service: `http://localhost:4001`
- Chat service: `http://localhost:4002`
- User service: `http://localhost:3002`
- PostgreSQL: `localhost:5432`

## Database Layout

All services share one PostgreSQL instance. Isolation happens by schema:

- `auth`
- `chat`
- `user_management`

The bootstrap SQL at `ops/init.sql` creates the required extensions and schemas before the application services start.
