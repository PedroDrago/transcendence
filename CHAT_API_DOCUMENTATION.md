# TranscendenceChat - API Documentation

## Arquitetura

O sistema usa dois servicos independentes com banco PostgreSQL compartilhado:

| Servico | URL | Responsabilidade |
|---------|-----|------------------|
| **Auth** | `http://localhost:4001` | Cadastro, login, JWT |
| **Chat** | `http://localhost:4002` | Conversas, mensagens, WebSocket |

O Auth gerencia a tabela `auth.users` (UUID). O Chat le dessa tabela e gerencia suas proprias tabelas no schema `chat`.

**Importante:** `user_id` e um **UUID** (string) em todo o sistema — ex: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`.

---

## Auth Service (`http://localhost:4001`)

### POST `/auth/register`

Cadastra um novo usuario.

**Request:**
```json
{
  "username": "joao",
  "password": "minhasenha123"
}
```

**Response (201):**
```json
{
  "message": "registered",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "joao",
    "createdAt": "2026-04-13T10:00:00.000Z"
  }
}
```

**Erros:**
- `400` — Validacao (username 3-20 chars, password 8-256 chars)
- `409` — Username ja existe

---

### POST `/auth/login`

Autentica e retorna um JWT.

**Request:**
```json
{
  "username": "joao",
  "password": "minhasenha123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**JWT payload (decodificado):**
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "joao",
  "iat": 1681300000,
  "exp": 1681303600
}
```

**Erros:**
- `401` — Credenciais invalidas

**Como extrair `user_id` e `username` do JWT:**
```javascript
function decodeJwt(token) {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

const claims = decodeJwt(access_token);
const userId = claims.sub;       // UUID string
const username = claims.username;
```

- Guarde `user_id` (UUID) e `access_token` — o `user_id` e necessario em todas as operacoes do Chat
- O token expira conforme configurado no auth (`JWT_EXPIRES_IN`, padrao 1h)

---

### PATCH `/auth/password`

Altera a senha (requer JWT).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "currentPassword": "minhasenha123",
  "newPassword": "novasenha456"
}
```

**Erros:**
- `401` — JWT ausente ou invalido
- `403` — Senha atual incorreta
- `400` — Nova senha igual a atual

---

## Chat Service (`http://localhost:4002`)

### REST API

Todos os endpoints retornam JSON. Os endpoints POST recebem JSON no body (`Content-Type: application/json`). Os endpoints GET recebem query parameters.

---

### POST `/api/login`

Busca um usuario existente pelo username. **Nao cria usuarios** — o cadastro e feito pelo Auth Service.

**Request:**
```json
{
  "username": "joao"
}
```

**Response (200):**
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (404):**
```json
{
  "error": "User not found"
}
```

- Endpoint opcional — se voce ja tem o `user_id` do JWT do Auth Service, pode usar direto
- Util para buscar o UUID de um usuario pelo username

---

### POST `/api/conversation`

Cria ou recupera uma conversa 1-a-1 entre dois usuarios.

**Request:**
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "recipient_name": "maria"
}
```

**Response (200):**
```json
{
  "conversation_id": 5,
  "recipient_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "recipient_name": "maria"
}
```

**Response (404) — destinatario nao encontrado:**
```json
{
  "error": "User not found"
}
```

- Se a conversa ja existe entre os dois usuarios, ela e retornada (nao cria duplicata)
- `conversation_id` e um **integer** (diferente de `user_id` que e UUID)
- Guarde o `conversation_id` para usar no WebSocket

---

### GET `/api/conversations?user_id={uuid}`

Lista todas as conversas do usuario, com a ultima mensagem de cada.

**Response (200):**
```json
{
  "conversations": [
    {
      "conversation_id": 5,
      "other_user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "other_user_name": "maria",
      "last_message": {
        "body": "Opa, tudo bem?",
        "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "inserted_at": "2026-04-12T10:30:00Z"
      }
    },
    {
      "conversation_id": 8,
      "other_user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "other_user_name": "pedro",
      "last_message": {
        "body": null,
        "user_id": null,
        "inserted_at": null
      }
    }
  ]
}
```

- `last_message` tem campos `null` quando a conversa nao tem mensagens ainda
- `last_message.user_id` indica quem enviou a ultima mensagem (UUID)
- Use para popular a lista de conversas na sidebar

---

### GET `/api/messages?conversation_id={id}`

Retorna todas as mensagens de uma conversa em ordem cronologica.

**Response (200):**
```json
{
  "messages": [
    {
      "body": "Opa, tudo bem?",
      "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "inserted_at": "2026-04-12T10:30:00Z"
    },
    {
      "body": "Tudo certo!",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "inserted_at": "2026-04-12T10:31:15Z"
    }
  ]
}
```

- Ordenadas da mais antiga para a mais recente
- `user_id` (UUID) indica quem enviou — compare com o seu `user_id` para distinguir mensagens enviadas/recebidas

---

## WebSocket

A comunicacao em tempo real usa Phoenix Channels sobre WebSocket.

### Conexao

```
ws://localhost:4002/socket?user_id={user_id_uuid}
```

```javascript
import { Socket } from "phoenix";

const socket = new Socket("ws://localhost:4002/socket", {
  params: { user_id: userId }  // UUID string
});
socket.connect();
```

O `user_id` (UUID) passado na conexao identifica o usuario em todos os channels.

---

## Channels

### `user:{user_id}` — Notificacoes pessoais

Channel pessoal do usuario. Serve para receber notificacoes de mensagens em conversas que o frontend ainda nao entrou (join) no chat channel.

**Entrar:**
```javascript
const userChannel = socket.channel(`user:${userId}`);
userChannel.join();
```

- So o proprio usuario pode entrar no seu channel (valida `user_id` do socket)
- `userId` e o UUID — ex: `user:a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Entre neste channel logo apos conectar ao socket

#### Evento recebido: `new_conversation_message`

Disparado quando alguem envia uma mensagem em qualquer conversa do usuario.

```javascript
userChannel.on("new_conversation_message", (payload) => {
  // payload:
  // {
  //   "conversation_id": 5,
  //   "sender_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  //   "sender_name": "maria",
  //   "body": "Opa, respondeu!"
  // }
});
```

**IMPORTANTE — Evitar notificacao duplicada:**
Quando o frontend ja esta no `chat:{conversation_id}`, a mensagem ja chega pelo evento `message` desse channel. O evento `new_conversation_message` do user channel **tambem** e disparado. Se voce processar os dois, a mensagem aparece duplicada.

**Regra**: Se o `chat:{conversation_id}` ja esta joined, **ignore** o `new_conversation_message` para aquele `conversation_id`. Use o evento do user channel apenas para:
- Conversas que o frontend ainda nao fez join (ex: alguem iniciou uma conversa nova com voce)
- Mostrar badges/notificacoes na lista de conversas

---

### `chat:{conversation_id}` — Conversa em tempo real

Channel de uma conversa especifica. Permite enviar/receber mensagens, indicar digitacao e confirmar leitura.

**Entrar:**
```javascript
const chatChannel = socket.channel(`chat:${conversationId}`);
chatChannel.join()
  .receive("ok", () => console.log("Conectado"))
  .receive("error", (err) => console.log("Erro:", err));
  // err = { "reason": "unauthorized" } se o usuario nao pertence a conversa
```

- O backend valida que o `user_id` do socket e participante da conversa
- Se nao for, o join retorna `{ "reason": "unauthorized" }`
- `conversationId` e um **integer** (diferente de `user_id`)

---

#### Enviar: `message`

Envia uma mensagem na conversa. O backend salva no banco e faz broadcast para todos no channel.

```javascript
chatChannel.push("message", { body: "Ola!" });
```

**Evento recebido (broadcast para todos, incluindo o remetente):**
```javascript
chatChannel.on("message", (payload) => {
  // payload:
  // {
  //   "body": "Ola!",
  //   "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  // }
});
```

- O remetente tambem recebe o evento — use `payload.user_id === meuUserId` para distinguir mensagens proprias
- A mensagem ja esta persistida no banco quando o broadcast chega

---

#### Enviar: `typing`

Indica que o usuario esta digitando (ou parou de digitar).

```javascript
// Usuario comecou a digitar
chatChannel.push("typing", { is_typing: true });

// Usuario parou de digitar (ex: apos 2s sem teclar)
chatChannel.push("typing", { is_typing: false });
```

**Evento recebido (broadcast apenas para os outros participantes):**
```javascript
chatChannel.on("typing", (payload) => {
  // payload:
  // {
  //   "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  //   "is_typing": true
  // }
});
```

- O remetente **NAO** recebe de volta o proprio evento (usa `broadcast_from`)
- Recomendacao de implementacao no frontend:
  - Envie `is_typing: true` quando o usuario comecar a digitar
  - Use debounce: apos 2s sem keystrokes, envie `is_typing: false`
  - Ao enviar uma mensagem, envie `is_typing: false`
  - Ao receber o evento, mostre indicador (ex: "maria esta digitando...")
  - Limpe o indicador apos ~3s sem novo evento de typing (timeout de seguranca)

---

#### Enviar: `messages_read`

Confirma que o usuario leu as mensagens da conversa. Nao precisa de payload.

```javascript
chatChannel.push("messages_read", {});
```

**Evento recebido (broadcast apenas para os outros participantes):**
```javascript
chatChannel.on("messages_read", (payload) => {
  // payload:
  // {
  //   "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  // }
});
```

- O remetente **NAO** recebe de volta o proprio evento (usa `broadcast_from`)
- Envie quando:
  - O usuario abre/seleciona uma conversa
  - O usuario recebe uma mensagem na conversa que ja esta aberta/visivel
- Use para mostrar status de leitura (ex: "Lido" / "Enviado") na ultima mensagem enviada

---

## Tipos de ID

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `user_id` | UUID string | `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |
| `conversation_id` | integer | `5` |

**Atencao:** `user_id` e `conversation_id` sao tipos diferentes. Nao tente converter `user_id` para integer.

---

## Fluxo completo

```javascript
import { Socket } from "phoenix";

// 1. Cadastrar (uma vez)
await fetch("http://localhost:4001/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "joao", password: "minhasenha123" })
});

// 2. Login — obter JWT
const loginRes = await fetch("http://localhost:4001/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "joao", password: "minhasenha123" })
});
const { access_token } = await loginRes.json();

// 3. Extrair user_id do JWT
const claims = JSON.parse(atob(access_token.split(".")[1]));
const userId = claims.sub;       // UUID
const username = claims.username;

// 4. Conectar WebSocket ao Chat Service
const socket = new Socket("ws://localhost:4002/socket", {
  params: { user_id: userId }
});
socket.connect();

// 5. Entrar no user channel (notificacoes)
const userChannel = socket.channel(`user:${userId}`);
userChannel.join();

userChannel.on("new_conversation_message", (msg) => {
  // Ignorar se ja estamos no chat channel dessa conversa
  if (chatChannelsJoined.has(msg.conversation_id)) return;

  // Conversa nova — mostrar notificacao, fazer join no chat channel
  console.log(`${msg.sender_name}: ${msg.body}`);
});

// 6. Listar conversas existentes
const convRes = await fetch(`http://localhost:4002/api/conversations?user_id=${userId}`);
const { conversations } = await convRes.json();

// 7. Para cada conversa, fazer join no chat channel
conversations.forEach((conv) => {
  const ch = socket.channel(`chat:${conv.conversation_id}`);
  ch.join();

  ch.on("message", (msg) => { /* renderizar mensagem */ });
  ch.on("typing", (data) => { /* mostrar/esconder indicador */ });
  ch.on("messages_read", (data) => { /* atualizar status de leitura */ });
});

// 8. Criar conversa nova
const newConvRes = await fetch("http://localhost:4002/api/conversation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: userId, recipient_name: "maria" })
});
const { conversation_id } = await newConvRes.json();

// 9. Carregar historico
const msgsRes = await fetch(`http://localhost:4002/api/messages?conversation_id=${conversation_id}`);
const { messages } = await msgsRes.json();

// 10. Entrar no chat channel da nova conversa
const chatChannel = socket.channel(`chat:${conversation_id}`);
chatChannel.join();

// 11. Enviar mensagem
chatChannel.push("message", { body: "Opa, tudo bem?" });

// 12. Indicar digitacao
chatChannel.push("typing", { is_typing: true });

// 13. Confirmar leitura
chatChannel.push("messages_read", {});
```

---

## Tabela de referencia rapida

### Auth Service (porta 4001)

| Metodo | Rota | Body | Response |
|--------|------|------|----------|
| POST | `/auth/register` | `{ "username", "password" }` | `{ "message", "user": { "id", "username", "createdAt" } }` |
| POST | `/auth/login` | `{ "username", "password" }` | `{ "access_token": "JWT..." }` |
| PATCH | `/auth/password` | `{ "currentPassword", "newPassword" }` | (vazio, 200) |

### Chat Service — REST (porta 4002)

| Metodo | Rota | Body / Params | Response |
|--------|------|---------------|----------|
| POST | `/api/login` | `{ "username": "..." }` | `{ "user_id": "uuid" }` |
| POST | `/api/conversation` | `{ "user_id": "uuid", "recipient_name": "..." }` | `{ "conversation_id": 5, "recipient_id": "uuid", "recipient_name": "..." }` |
| GET | `/api/conversations` | `?user_id=uuid` | `{ "conversations": [...] }` |
| GET | `/api/messages` | `?conversation_id=5` | `{ "messages": [...] }` |

### WebSocket — Eventos enviados (push)

| Channel | Evento | Payload | Descricao |
|---------|--------|---------|-----------|
| `chat:*` | `message` | `{ "body": "..." }` | Envia mensagem |
| `chat:*` | `typing` | `{ "is_typing": true/false }` | Indica digitacao |
| `chat:*` | `messages_read` | `{}` | Confirma leitura |

### WebSocket — Eventos recebidos (on)

| Channel | Evento | Payload | Quem recebe |
|---------|--------|---------|-------------|
| `chat:*` | `message` | `{ "body", "user_id" }` | Todos no channel |
| `chat:*` | `typing` | `{ "user_id", "is_typing" }` | Todos exceto remetente |
| `chat:*` | `messages_read` | `{ "user_id" }` | Todos exceto remetente |
| `user:*` | `new_conversation_message` | `{ "conversation_id", "sender_id", "sender_name", "body" }` | Apenas o dono do channel |

---

## Checklist de implementacao

### Auth
- [ ] `POST /auth/register` — cadastrar usuario (username 3-20 chars, password 8-256 chars)
- [ ] `POST /auth/login` — fazer login e guardar `access_token`
- [ ] Decodificar JWT para extrair `user_id` (UUID) e `username`
- [ ] Verificar expiracao do token e renovar se necessario

### Chat
- [ ] Conectar ao WebSocket (`ws://localhost:4002/socket`) com `user_id` (UUID)
- [ ] Entrar no `user:{user_id}` — ouvir `new_conversation_message`
- [ ] `GET /api/conversations` — listar conversas do usuario
- [ ] Entrar no `chat:{id}` de cada conversa existente
- [ ] `POST /api/conversation` — criar/obter conversa com outro usuario
- [ ] `GET /api/messages` — carregar historico de mensagens
- [ ] Enviar `message` no chat channel
- [ ] Ouvir `message` no chat channel — renderizar mensagens
- [ ] Enviar `typing` — debounce de 2s, limpar ao enviar mensagem
- [ ] Ouvir `typing` — mostrar indicador, timeout de 3s
- [ ] Enviar `messages_read` — ao abrir conversa ou receber mensagem visivel
- [ ] Ouvir `messages_read` — mostrar "Lido" na ultima mensagem enviada
- [ ] Tratar duplicata: ignorar `new_conversation_message` se ja esta no chat channel
