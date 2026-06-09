# --- Build stage -------------------------------------------------------------
# elixir:1.17-alpine is currently based on Alpine 3.22; the runtime stage must
# use a matching Alpine so the bundled ERTS (musl) is ABI-compatible.
FROM elixir:1.17-alpine AS builder

RUN apk add --no-cache build-base git

WORKDIR /app

RUN mix local.hex --force && mix local.rebar --force

ENV MIX_ENV=prod

# Install prod dependencies first so they are cached across source changes.
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod

# Compile-time config must be present before compiling deps.
COPY config config
RUN mix deps.compile

COPY priv priv
COPY lib lib

RUN mix compile
RUN mix release

# --- Runtime stage -----------------------------------------------------------
FROM alpine:3.22 AS app

RUN apk add --no-cache libstdc++ openssl ncurses-libs libgcc ca-certificates \
  && addgroup -S app && adduser -S app -G app

WORKDIR /app

ENV MIX_ENV=prod \
    PHX_SERVER=true

COPY --from=builder --chown=app:app /app/_build/prod/rel/transcendence_chat ./

USER app

EXPOSE 4002

# Migrations run automatically at boot via Ecto.Migrator (see application.ex)
# because RELEASE_NAME is set inside a release.
CMD ["bin/transcendence_chat", "start"]
