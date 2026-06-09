# ---- Dependências base ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g npm@11
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build da aplicação ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
RUN npm run build

# ---- Imagem final para produção ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000


# Copia arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "start"]
