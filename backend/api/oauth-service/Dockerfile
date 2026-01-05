# ---- Dependências base ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ---- Build da aplicação ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Instala dependências de desenvolvimento para o build
RUN npm ci
# Compila o TypeScript
RUN npm run build

# ---- Imagem final para produção ----
FROM node:20-alpine AS runner
WORKDIR /app

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fastify -u 1001

# Copia arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Define permissões corretas
RUN chown -R fastify:nodejs /app
USER fastify

# Expõe a porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ping || exit 1

# Comando de inicialização
CMD ["npm", "start"]