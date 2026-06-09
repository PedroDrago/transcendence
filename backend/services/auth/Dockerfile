FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev && npm cache clean --force

RUN chown -R node:node /app
USER node

CMD ["node", "dist/main"]
