# Pinned to node:22-alpine via SHA256 digest to prevent vulnerabilities and ensure immutability
FROM node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a05a5cad1a7683f

RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build && npm prune --omit=dev && npm cache clean --force

RUN chmod u+x ./entrypoint.sh

RUN chown -R node:node /app
USER node

ENTRYPOINT ["./entrypoint.sh"]
