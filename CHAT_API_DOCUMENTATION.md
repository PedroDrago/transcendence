# TranscendenceChat - API Documentation

## Arquitetura

O sistema usa dois servicos independentes com banco PostgreSQL compartilhado:

| Servico | URL | Responsabilidade |
|---------|-----|------------------|
| **Auth** | `http://localhost:4001` | Cadastro, login, JWT |
| **Chat** | `http://localhost:4002` | Conversas (diretas e grupo), mensagens, presenca online, WebSocket |

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

Todos os endpoints retornam JSON. Os endpoints POST/PATCH recebem JSON no body (`Content-Type: application/json`). Os endpoints GET recebem query parameters.

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

Cria ou recupera uma conversa direta (1-a-1) entre dois usuarios.

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
- Apenas busca conversas do tipo `"direct"` — grupos nao sao afetados
- `conversation_id` e um **integer** (diferente de `user_id` que e UUID)
- Guarde o `conversation_id` para usar no WebSocket

---

### GET `/api/conversations?user_id={uuid}`

Lista todas as conversas do usuario (diretas e grupos), com a ultima mensagem de cada.

**Response (200):**
```json
{
  "conversations": [
    {
      "conversation_id": 5,
      "type": "direct",
      "name": null,
      "other_user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "other_user_name": "maria",
      "members": [
        { "user_id": "a1b2c3d4-...", "username": "joao", "role": "member" },
        { "user_id": "b2c3d4e5-...", "username": "maria", "role": "member" }
      ],
      "last_message": {
        "body": "Opa, tudo bem?",
        "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "inserted_at": "2026-04-12T10:30:00Z"
      }
    },
    {
      "conversation_id": 12,
      "type": "group",
      "name": "Projeto Transcendence",
      "members": [
        { "user_id": "a1b2c3d4-...", "username": "joao", "role": "admin" },
        { "user_id": "b2c3d4e5-...", "username": "maria", "role": "member" },
        { "user_id": "c3d4e5f6-...", "username": "pedro", "role": "member" }
      ],
      "last_message": {
        "body": "Vamos marcar a reuniao",
        "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "inserted_at": "2026-04-13T14:00:00Z"
      }
    }
  ]
}
```

- `type` pode ser `"direct"` ou `"group"`
- Conversas diretas incluem `other_user_id` e `other_user_name` para compatibilidade
- Conversas de grupo incluem `name` (nome do grupo)
- Todas as conversas incluem `members` com `user_id`, `username` e `role` (`"admin"` ou `"member"`)
- `last_message` tem campos `null` quando a conversa nao tem mensagens ainda

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

## Group Chat API

### POST `/api/group`

Cria uma conversa de grupo. O criador se torna admin automaticamente.

**Request:**
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Projeto Transcendence",
  "member_ids": [
    "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "c3d4e5f6-a7b8-9012-cdef-123456789012"
  ]
}
```

**Response (201):**
```json
{
  "conversation_id": 12,
  "name": "Projeto Transcendence"
}
```

- `user_id` e o criador do grupo (vira admin)
- `member_ids` sao os outros participantes (entram como member)
- O criador nao precisa estar em `member_ids`

---

### POST `/api/group/:id/members`

Adiciona um membro ao grupo. Apenas admins podem executar.

**Request:**
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "new_member_id": "d4e5f6a7-b8c9-0123-def0-234567890123"
}
```

- `user_id` e quem esta fazendo a acao (deve ser admin)
- `new_member_id` e quem sera adicionado

**Response (200):** `{ "ok": true }`

**Erros:**
- `403` — Apenas admins podem adicionar membros
- `409` — Membro ja existe na conversa

---

### DELETE `/api/group/:id/members/:user_id?requester_id={uuid}`

Remove um membro do grupo. Apenas admins podem executar.

- `:user_id` no path e o membro a ser removido
- `requester_id` no query param e quem esta fazendo a acao (deve ser admin)

**Response (200):** `{ "ok": true }`

**Erros:**
- `403` — Apenas admins podem remover membros

---

### PATCH `/api/group/:id`

Atualiza o nome do grupo. Apenas admins podem executar.

**Request:**
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Novo Nome do Grupo"
}
```

- `user_id` e quem esta fazendo a acao (deve ser admin)

**Response (200):** `{ "ok": true, "name": "Novo Nome do Grupo" }`

**Erros:**
- `403` — Apenas admins podem atualizar o grupo

---

## Online Status API

### GET `/api/users/online`

Retorna a lista de user_ids que estao online neste momento.

**Response (200):**
```json
{
  "online": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

- Baseado no Phoenix Presence — rastreia conexoes WebSocket ativas
- Um user aparece como online enquanto tiver pelo menos um socket conectado

---

### GET `/api/users/:user_id/last_seen`

Retorna o timestamp de quando o user foi visto pela ultima vez (ultima desconexao).

**Response (200):**
```json
{
  "last_seen_at": "2026-04-13T15:30:00Z"
}
```

**Response (200) — user nunca conectou:**
```json
{
  "last_seen_at": null
}
```

- Salvo automaticamente quando o user desconecta do WebSocket
- Util para mostrar "visto por ultimo as X" quando o user esta offline

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

### `user:{user_id}` — Notificacoes e Presenca

Channel pessoal do usuario. Serve para receber notificacoes de mensagens e atualizacoes de presenca (quem esta online/offline).

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

#### Evento recebido: `presence_state`

Recebido logo apos o join. Contem a lista completa de quem esta online.

```javascript
userChannel.on("presence_state", (state) => {
  // state e um mapa de user_id => { metas: [{ online_at: timestamp }] }
  // Exemplo:
  // {
  //   "b2c3d4e5-...": { metas: [{ online_at: 1681300000 }] },
  //   "c3d4e5f6-...": { metas: [{ online_at: 1681300050 }] }
  // }
  const onlineUserIds = Object.keys(state);
});
```

#### Evento recebido: `presence_diff`

Recebido sempre que alguem conecta ou desconecta.

```javascript
userChannel.on("presence_diff", (diff) => {
  // diff.joins — users que acabaram de ficar online
  // diff.leaves — users que acabaram de ficar offline
  // Exemplo:
  // {
  //   "joins": { "d4e5f6a7-...": { metas: [{ online_at: 1681300100 }] } },
  //   "leaves": {}
  // }

  // Adicionar users online
  Object.keys(diff.joins).forEach(uid => markOnline(uid));

  // Remover users offline
  Object.keys(diff.leaves).forEach(uid => markOffline(uid));
});
```

- Use `presence_state` para inicializar a lista de online
- Use `presence_diff` para manter atualizada em tempo real
- Para mostrar "visto por ultimo", chame `GET /api/users/:id/last_seen` quando o user aparece como offline

---

### `chat:{conversation_id}` — Conversa em tempo real

Channel de uma conversa especifica (direta ou grupo). Permite enviar/receber mensagens, indicar digitacao, confirmar leitura e gerenciar membros do grupo.

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
- Funciona tanto para conversas diretas quanto para grupos

---

#### Enviar: `message`

Envia uma mensagem na conversa. O backend salva no banco, notifica cada membro via user channel e faz broadcast para todos no chat channel.

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
- Em grupos, todos os membros da conversa recebem a notificacao via user channel (exceto o remetente)

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
- Em grupos, voce pode receber typing de multiplos users simultaneamente
- Recomendacao de implementacao no frontend:
  - Envie `is_typing: true` quando o usuario comecar a digitar
  - Use debounce: apos 2s sem keystrokes, envie `is_typing: false`
  - Ao enviar uma mensagem, envie `is_typing: false`
  - Ao receber o evento, mostre indicador (ex: "maria esta digitando...")
  - Em grupos, mostre multiplos indicadores (ex: "maria e pedro estao digitando...")
  - Limpe o indicador apos ~3s sem novo evento de typing (timeout de seguranca)

---

#### Enviar: `messages_read`

Confirma que o usuario leu as mensagens da conversa. O backend persiste no banco e notifica os outros participantes.

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
- Persiste no banco: marca todas as mensagens nao lidas da conversa como lidas pelo user
- Nao marca as proprias mensagens do user (so marca mensagens de outros)
- Idempotente — chamar varias vezes nao cria duplicatas
- Envie quando:
  - O usuario abre/seleciona uma conversa
  - O usuario recebe uma mensagem na conversa que ja esta aberta/visivel

---

#### Enviar: `add_member` (apenas grupos)

Adiciona um membro ao grupo. Apenas admins podem executar.

```javascript
chatChannel.push("add_member", { user_id: "d4e5f6a7-..." })
  .receive("ok", () => console.log("Membro adicionado"))
  .receive("error", (err) => console.log(err.reason));
  // err.reason: "only admins can add members" ou "could not add member"
```

**Evento recebido (broadcast para todos no channel):**
```javascript
chatChannel.on("member_added", (payload) => {
  // payload:
  // {
  //   "user_id": "d4e5f6a7-b8c9-0123-def0-234567890123",
  //   "username": "carlos"
  // }
});
```

---

#### Enviar: `remove_member` (apenas grupos)

Remove um membro do grupo. Apenas admins podem executar.

```javascript
chatChannel.push("remove_member", { user_id: "d4e5f6a7-..." })
  .receive("ok", () => console.log("Membro removido"))
  .receive("error", (err) => console.log(err.reason));
```

**Evento recebido (broadcast para todos no channel):**
```javascript
chatChannel.on("member_removed", (payload) => {
  // payload:
  // {
  //   "user_id": "d4e5f6a7-b8c9-0123-def0-234567890123"
  // }
});
```

---

#### Enviar: `update_group` (apenas grupos)

Atualiza o nome do grupo. Apenas admins podem executar.

```javascript
chatChannel.push("update_group", { name: "Novo Nome" })
  .receive("ok", () => console.log("Grupo atualizado"))
  .receive("error", (err) => console.log(err.reason));
```

**Evento recebido (broadcast para todos no channel):**
```javascript
chatChannel.on("group_updated", (payload) => {
  // payload:
  // {
  //   "name": "Novo Nome"
  // }
});
```

---

## Tipos de ID

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `user_id` | UUID string | `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |
| `conversation_id` | integer | `5` |

**Atencao:** `user_id` e `conversation_id` sao tipos diferentes. Nao tente converter `user_id` para integer.

---

## Roles em grupos

| Role | Permissoes |
|------|-----------|
| `admin` | Adicionar/remover membros, renomear grupo, enviar mensagens |
| `member` | Enviar mensagens, ver membros |

- O criador do grupo vira `admin` automaticamente
- Novos membros entram como `member`

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

// 5. Entrar no user channel (notificacoes + presenca)
const userChannel = socket.channel(`user:${userId}`);
userChannel.join();

// 5a. Inicializar lista de users online
let onlineUsers = new Set();

userChannel.on("presence_state", (state) => {
  onlineUsers = new Set(Object.keys(state));
});

userChannel.on("presence_diff", (diff) => {
  Object.keys(diff.joins).forEach(uid => onlineUsers.add(uid));
  Object.keys(diff.leaves).forEach(uid => onlineUsers.delete(uid));
});

// 5b. Ouvir notificacoes de mensagens
userChannel.on("new_conversation_message", (msg) => {
  // Ignorar se ja estamos no chat channel dessa conversa
  if (chatChannelsJoined.has(msg.conversation_id)) return;

  // Conversa nova — mostrar notificacao, fazer join no chat channel
  console.log(`${msg.sender_name}: ${msg.body}`);
});

// 6. Listar conversas existentes (diretas + grupos)
const convRes = await fetch(`http://localhost:4002/api/conversations?user_id=${userId}`);
const { conversations } = await convRes.json();

// 7. Para cada conversa, fazer join no chat channel
conversations.forEach((conv) => {
  const ch = socket.channel(`chat:${conv.conversation_id}`);
  ch.join();

  ch.on("message", (msg) => { /* renderizar mensagem */ });
  ch.on("typing", (data) => { /* mostrar/esconder indicador */ });
  ch.on("messages_read", (data) => { /* atualizar status de leitura */ });

  // Eventos de grupo (se aplicavel)
  ch.on("member_added", (data) => { /* atualizar lista de membros */ });
  ch.on("member_removed", (data) => { /* atualizar lista de membros */ });
  ch.on("group_updated", (data) => { /* atualizar nome do grupo */ });
});

// 8a. Criar conversa direta
const newConvRes = await fetch("http://localhost:4002/api/conversation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: userId, recipient_name: "maria" })
});
const { conversation_id } = await newConvRes.json();

// 8b. Criar grupo
const groupRes = await fetch("http://localhost:4002/api/group", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: userId,
    name: "Projeto Transcendence",
    member_ids: ["uuid-maria", "uuid-pedro"]
  })
});
const { conversation_id: groupId } = await groupRes.json();

// 9. Carregar historico
const msgsRes = await fetch(`http://localhost:4002/api/messages?conversation_id=${conversation_id}`);
const { messages } = await msgsRes.json();

// 10. Entrar no chat channel da conversa
const chatChannel = socket.channel(`chat:${conversation_id}`);
chatChannel.join();

// 11. Enviar mensagem
chatChannel.push("message", { body: "Opa, tudo bem?" });

// 12. Indicar digitacao
chatChannel.push("typing", { is_typing: true });

// 13. Confirmar leitura
chatChannel.push("messages_read", {});

// 14. Verificar se user esta online
const isOnline = onlineUsers.has("uuid-maria");

// 15. Consultar "visto por ultimo" se offline
if (!isOnline) {
  const lastSeenRes = await fetch(`http://localhost:4002/api/users/uuid-maria/last_seen`);
  const { last_seen_at } = await lastSeenRes.json();
}
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
| POST | `/api/login` | `{ "username" }` | `{ "user_id": "uuid" }` |
| POST | `/api/conversation` | `{ "user_id", "recipient_name" }` | `{ "conversation_id", "recipient_id", "recipient_name" }` |
| GET | `/api/conversations` | `?user_id=uuid` | `{ "conversations": [...] }` |
| GET | `/api/messages` | `?conversation_id=5` | `{ "messages": [...] }` |
| POST | `/api/group` | `{ "user_id", "name", "member_ids" }` | `{ "conversation_id", "name" }` |
| POST | `/api/group/:id/members` | `{ "user_id", "new_member_id" }` | `{ "ok": true }` |
| DELETE | `/api/group/:id/members/:uid` | `?requester_id=uuid` | `{ "ok": true }` |
| PATCH | `/api/group/:id` | `{ "user_id", "name" }` | `{ "ok": true, "name" }` |
| GET | `/api/users/online` | — | `{ "online": ["uuid", ...] }` |
| GET | `/api/users/:uid/last_seen` | — | `{ "last_seen_at": "ISO8601" }` |

### WebSocket — Eventos enviados (push)

| Channel | Evento | Payload | Descricao |
|---------|--------|---------|-----------|
| `chat:*` | `message` | `{ "body": "..." }` | Envia mensagem |
| `chat:*` | `typing` | `{ "is_typing": true/false }` | Indica digitacao |
| `chat:*` | `messages_read` | `{}` | Confirma leitura (persiste no banco) |
| `chat:*` | `add_member` | `{ "user_id": "uuid" }` | Adiciona membro (admin) |
| `chat:*` | `remove_member` | `{ "user_id": "uuid" }` | Remove membro (admin) |
| `chat:*` | `update_group` | `{ "name": "..." }` | Renomeia grupo (admin) |

### WebSocket — Eventos recebidos (on)

| Channel | Evento | Payload | Quem recebe |
|---------|--------|---------|-------------|
| `chat:*` | `message` | `{ "body", "user_id" }` | Todos no channel |
| `chat:*` | `typing` | `{ "user_id", "is_typing" }` | Todos exceto remetente |
| `chat:*` | `messages_read` | `{ "user_id" }` | Todos exceto remetente |
| `chat:*` | `member_added` | `{ "user_id", "username" }` | Todos no channel |
| `chat:*` | `member_removed` | `{ "user_id" }` | Todos no channel |
| `chat:*` | `group_updated` | `{ "name" }` | Todos no channel |
| `user:*` | `new_conversation_message` | `{ "conversation_id", "sender_id", "sender_name", "body" }` | Apenas o dono do channel |
| `user:*` | `presence_state` | `{ "user_id": { metas: [...] } }` | Apenas o dono (no join) |
| `user:*` | `presence_diff` | `{ "joins": {...}, "leaves": {...} }` | Apenas o dono do channel |

---

## Checklist de implementacao

### Auth
- [ ] `POST /auth/register` — cadastrar usuario (username 3-20 chars, password 8-256 chars)
- [ ] `POST /auth/login` — fazer login e guardar `access_token`
- [ ] Decodificar JWT para extrair `user_id` (UUID) e `username`
- [ ] Verificar expiracao do token e renovar se necessario

### Chat — Conversas diretas
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

### Chat — Grupos
- [ ] `POST /api/group` — criar grupo com nome e lista de membros
- [ ] Distinguir tipo `"direct"` e `"group"` na lista de conversas
- [ ] Mostrar nome do grupo e lista de membros
- [ ] Enviar `add_member` — adicionar membro (admin apenas)
- [ ] Enviar `remove_member` — remover membro (admin apenas)
- [ ] Enviar `update_group` — renomear grupo (admin apenas)
- [ ] Ouvir `member_added`, `member_removed`, `group_updated` — atualizar UI
- [ ] Mostrar typing de multiplos users em grupos

### Presenca online
- [ ] Ouvir `presence_state` no user channel — inicializar lista de online
- [ ] Ouvir `presence_diff` no user channel — atualizar online/offline
- [ ] `GET /api/users/online` — polling inicial (opcional, presence_state ja cobre)
- [ ] `GET /api/users/:id/last_seen` — mostrar "visto por ultimo" para offline
- [ ] Indicador visual (bolinha verde/cinza) na lista de conversas e no chat
