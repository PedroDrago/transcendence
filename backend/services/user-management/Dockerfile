FROM node:22.15.1-alpine3.22

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
