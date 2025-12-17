# Transcendence - Docker Compose Configurations

Esta pasta contém as configurações Docker Compose para os ambientes de desenvolvimento e produção.

## 📁 Estrutura

```
ops/
├── docker-compose.dev.yml   # Ambiente de desenvolvimento
├── docker-compose.prod.yml  # Ambiente de produção
├── .env.example             # Exemplo de variáveis de ambiente
└── README.md               # Este arquivo
```

## 🚀 Uso

### Desenvolvimento

Para rodar o ambiente de desenvolvimento com hot reload:

```bash
cd ops
docker-compose -f docker-compose.dev.yml up
```

Ou em modo detached (background):

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Para parar:

```bash
docker-compose -f docker-compose.dev.yml down
```

**Serviços disponíveis:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Produção

Para rodar o ambiente de produção:

1. Copie o arquivo de exemplo e configure as variáveis:
   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` com suas configurações de produção

3. Inicie os serviços:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

Para parar:

```bash
docker-compose -f docker-compose.prod.yml down
```

**Serviços disponíveis:**
- Frontend: http://localhost:3000 (interno)
- Backend API: http://localhost:4000 (interno)
- PostgreSQL: localhost:5432

## 🔧 Comandos Úteis

### Ver logs
```bash
# Todos os serviços
docker-compose -f docker-compose.dev.yml logs -f

# Serviço específico
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
```

### Reconstruir imagens
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Limpar volumes (⚠️ apaga dados)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Acessar container
```bash
docker-compose -f docker-compose.dev.yml exec backend sh
docker-compose -f docker-compose.dev.yml exec frontend sh
```

### Executar comandos no backend
```bash
# Migrations
docker-compose -f docker-compose.dev.yml exec backend npm run migration:run

# Seeds
docker-compose -f docker-compose.dev.yml exec backend npm run seed

# Tests
docker-compose -f docker-compose.dev.yml exec backend npm test
```

## 📦 Serviços

### Frontend (Next.js)
- **Dev**: Hot reload ativado, código montado via volume
- **Prod**: Build otimizado, imagem standalone
- **Porta**: 3000

### Backend (NestJS)
- **Dev**: Hot reload ativado via `start:dev`, código montado via volume
- **Prod**: Build otimizado, execução com `start:prod`
- **Porta**: 4000

### Database (PostgreSQL 16)
- **Usuário**: transcendence
- **Database**: transcendence_dev ou transcendence_prod
- **Porta**: 5432
- **Volumes persistentes**: dados salvos mesmo após restart

### Redis
- **Porta**: 6379
- **Uso**: Cache, sessões, filas
- **Prod**: Persistência AOF ativada

### Nginx (apenas prod)
- **Portas**: 80 (HTTP), 443 (HTTPS)
- **Uso**: Reverse proxy, balanceamento de carga
- **Configuração**: `nginx/nginx.conf` (a criar)

## 🔐 Segurança

### Produção
1. **Sempre** use senhas fortes no `.env`
2. **Nunca** commite o arquivo `.env` (já está no .gitignore)
3. Configure SSL/TLS no Nginx para HTTPS
4. Limite o acesso externo ao banco de dados
5. Use secrets management em produção real (Docker Secrets, Vault, etc)

## 🐛 Troubleshooting

### Porta já em uso
```bash
# Verifica o que está usando a porta
sudo lsof -i :3000
sudo lsof -i :4000

# Ou muda a porta no docker-compose
ports:
  - "3001:3000"  # Mapeia porta externa 3001 para interna 3000
```

### Problemas de permissão
```bash
# Recria volumes
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up
```

### Container não inicia
```bash
# Verifica logs
docker-compose -f docker-compose.dev.yml logs backend

# Verifica status
docker-compose -f docker-compose.dev.yml ps
```

## 📝 Notas

- O ambiente de **desenvolvimento** monta o código via volumes para hot reload
- O ambiente de **produção** usa builds otimizados sem volumes de código
- Healthchecks estão configurados apenas em produção
- Volumes de dados são nomeados e persistentes em ambos ambientes
