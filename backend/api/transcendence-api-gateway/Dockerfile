# ---- Dependências base ----

# ---- Dependências base ----

# ---- Dependências base ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build da aplicação (usa usuário não-root) ----

# ---- Build da aplicação (como root) ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Copia arquivos de configuração necessários para o build
COPY tsconfig.json ./
COPY nest-cli.json ./
ENV NODE_ENV=production
RUN npm run build

# ---- Imagem final para produção ----

# ---- Imagem final para produção ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 backend
# Copia arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/nest-cli.json ./nest-cli.json
# Ajusta permissões para o usuário não-root
RUN chown -R backend:nodejs /app
USER backend
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
