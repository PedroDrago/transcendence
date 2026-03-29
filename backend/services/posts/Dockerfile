FROM oven/bun:1.3.11-alpine AS base

WORKDIR /usr/src/app

FROM base AS deps

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

FROM deps AS builder

COPY . .

RUN bun install --production --frozen-lockfile

FROM oven/bun:1.3.11-distroless AS release

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY --from=base /etc/passwd /etc/passwd

COPY --from=base /etc/group /etc/group

COPY --from=builder /usr/src/app/node_modules ./node_modules

COPY --from=builder /usr/src/app/src ./src

COPY --from=builder /usr/src/app/package.json .

COPY --from=builder /usr/src/app/tsconfig.json .

USER bun

EXPOSE 3333

ENTRYPOINT ["bun", "run", "src/http/server.ts"]
