# Ops

`ops/` no longer owns Docker Compose files.

The repository now uses a single root-level `compose.yml` plus a single root-level `.env`. This directory only keeps shared operational assets, currently:

- `init.sql`: idempotent PostgreSQL bootstrap for shared extensions and schemas

Start the stack from the repository root:

```bash
make up
```

The bootstrap SQL is applied by a one-shot `db-bootstrap` container before the database-backed services start.
