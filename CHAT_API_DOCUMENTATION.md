# TranscendenceChat - API Documentation

## Autenticacao

Todas as rotas `/api/*` e a conexao WebSocket esperam um **JWT** emitido pelo Auth Service.

- **REST**: header `Authorization: Bearer <access_token>`
- **WebSocket**: query-param `token=<access_token>`

> **Importante**: o chat **nao valida** assinatura nem expiracao do token — essa validacao e responsabilidade do API gateway, que fica a frente do chat. O chat apenas decodifica o payload para extrair `sub` (user_id UUID) e `username`. Nunca expor o chat diretamente para a internet sem o gateway.

Claims lidos: `sub` (user_id UUID) e `username`. Outros claims sao ignorados.

Respostas em caso de token ausente/malformado (ou sem `sub`):
- REST: `401 { "error": "unauthorized" }`
- Socket: `connect` retorna `:error` e a conexao e recusada

O `user_id` **nunca** vem do body/query do cliente — e sempre extraido do JWT (`conn.assigns.current_user.id` no backend).

### REST API

Todos os endpoints retornam JSON. Os endpoints POST/PATCH recebem JSON no body (`Content-Type: application/json`). Os endpoints GET recebem query parameters.

---

### POST `/api/conversation`

Cria ou recupera uma conversa direta (1-a-1) entre o usuario autenticado e outro usuario.

**Request:**
```json
{
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

### GET `/api/conversations`

Lista todas as conversas do usuario autenticado (diretas e grupos), com a ultima mensagem de cada.

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

Retorna todas as mensagens de uma conversa em ordem cronologica. O backend valida que o usuario autenticado pertence a conversa.

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

**Response (403) — usuario nao pertence a conversa:**
```json
{ "error": "forbidden" }
```

- Ordenadas da mais antiga para a mais recente
- `user_id` (UUID) indica quem enviou — compare com o seu `user_id` para distinguir mensagens enviadas/recebidas

---

## Group Chat API

### POST `/api/group`

Cria uma conversa de grupo. O usuario autenticado se torna admin automaticamente.

**Request:**
```json
{
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

- O criador (usuario autenticado) vira admin; nao precisa estar em `member_ids`
- `member_ids` sao os outros participantes (entram como `member`)

---

### POST `/api/group/:id/members`

Adiciona um membro ao grupo. Apenas admins podem executar.

**Request:**
```json
{
  "new_member_id": "d4e5f6a7-b8c9-0123-def0-234567890123"
}
```

- `new_member_id` e quem sera adicionado
- O requisitante e o usuario autenticado (precisa ser admin do grupo)

**Response (200):** `{ "ok": true }`

**Erros:**
- `403` — Apenas admins podem adicionar membros
- `409` — Membro ja existe na conversa

---

### DELETE `/api/group/:id/members/:user_id`

Remove um membro do grupo. Apenas admins podem executar.

- `:user_id` no path e o membro a ser removido
- O requisitante e o usuario autenticado (precisa ser admin do grupo)

**Response (200):** `{ "ok": true }`

**Erros:**
- `403` — Apenas admins podem remover membros

---

### PATCH `/api/group/:id`

Atualiza o nome do grupo. Apenas admins podem executar.

**Request:**
```json
{
  "name": "Novo Nome do Grupo"
}
```

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
ws://localhost:4002/socket?token={access_token}
```

```javascript
import { Socket } from "phoenix";

const socket = new Socket("ws://localhost:4002/socket", {
  params: { token: accessToken }  // JWT emitido pelo auth-service
});
socket.connect();
```

- O JWT e validado no `connect`; se invalido/expirado, a conexao e recusada
- O `user_id` e extraido do claim `sub` do token — o cliente nao informa mais o `user_id`

---

## Channels

### `user:{user_id}` — Notificacoes e Presenca

Channel pessoal do usuario. Serve para receber notificacoes de mensagens e atualizacoes de presenca (quem esta online/offline).

**Entrar:**
```javascript
const userChannel = socket.channel(`user:${userId}`);
userChannel.join();
```

- So o proprio usuario pode entrar no seu channel (valida `user_id` do socket contra o topico)
- `userId` e o UUID extraido do JWT — ex: `user:a1b2c3d4-e5f6-7890-abcd-ef1234567890`
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

- O backend valida que o `user_id` do socket (vindo do JWT) e participante da conversa
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

// 1. Obter JWT do auth-service (fora do escopo deste doc)
const accessToken = /* ... access_token retornado pelo login no auth ... */;

// 2. Extrair user_id do JWT (claim "sub")
const claims = JSON.parse(atob(accessToken.split(".")[1]));
const userId = claims.sub;       // UUID
const username = claims.username;

// 3. Conectar WebSocket ao Chat Service (token como query-param)
const socket = new Socket("ws://localhost:4002/socket", {
  params: { token: accessToken }
});
socket.connect();

// 4. Entrar no user channel (notificacoes + presenca)
const userChannel = socket.channel(`user:${userId}`);
userChannel.join();

// 4a. Inicializar lista de users online
let onlineUsers = new Set();

userChannel.on("presence_state", (state) => {
  onlineUsers = new Set(Object.keys(state));
});

userChannel.on("presence_diff", (diff) => {
  Object.keys(diff.joins).forEach(uid => onlineUsers.add(uid));
  Object.keys(diff.leaves).forEach(uid => onlineUsers.delete(uid));
});

// 4b. Ouvir notificacoes de mensagens
userChannel.on("new_conversation_message", (msg) => {
  // Ignorar se ja estamos no chat channel dessa conversa
  if (chatChannelsJoined.has(msg.conversation_id)) return;

  // Conversa nova — mostrar notificacao, fazer join no chat channel
  console.log(`${msg.sender_name}: ${msg.body}`);
});

// Helper: todas as chamadas REST precisam do Authorization
const authHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${accessToken}`
};

// 5. Listar conversas existentes (diretas + grupos)
const convRes = await fetch("http://localhost:4002/api/conversations", {
  headers: authHeaders
});
const { conversations } = await convRes.json();

// 6. Para cada conversa, fazer join no chat channel
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

// 7a. Criar conversa direta
const newConvRes = await fetch("http://localhost:4002/api/conversation", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ recipient_name: "maria" })
});
const { conversation_id } = await newConvRes.json();

// 7b. Criar grupo
const groupRes = await fetch("http://localhost:4002/api/group", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    name: "Projeto Transcendence",
    member_ids: ["uuid-maria", "uuid-pedro"]
  })
});
const { conversation_id: groupId } = await groupRes.json();

// 8. Carregar historico
const msgsRes = await fetch(
  `http://localhost:4002/api/messages?conversation_id=${conversation_id}`,
  { headers: authHeaders }
);
const { messages } = await msgsRes.json();

// 9. Entrar no chat channel da conversa
const chatChannel = socket.channel(`chat:${conversation_id}`);
chatChannel.join();

// 10. Enviar mensagem
chatChannel.push("message", { body: "Opa, tudo bem?" });

// 11. Indicar digitacao
chatChannel.push("typing", { is_typing: true });

// 12. Confirmar leitura
chatChannel.push("messages_read", {});

// 13. Verificar se user esta online
const isOnline = onlineUsers.has("uuid-maria");

// 14. Consultar "visto por ultimo" se offline
if (!isOnline) {
  const lastSeenRes = await fetch(
    "http://localhost:4002/api/users/uuid-maria/last_seen",
    { headers: authHeaders }
  );
  const { last_seen_at } = await lastSeenRes.json();
}
```

---

## Tabela de referencia rapida

### Chat Service — REST (porta 4002)

Todas as rotas exigem `Authorization: Bearer <jwt>`.

| Metodo | Rota | Body / Params | Response |
|--------|------|---------------|----------|
| POST | `/api/conversation` | `{ "recipient_name" }` | `{ "conversation_id", "recipient_id", "recipient_name" }` |
| GET | `/api/conversations` | — | `{ "conversations": [...] }` |
| GET | `/api/messages` | `?conversation_id=5` | `{ "messages": [...] }` |
| POST | `/api/group` | `{ "name", "member_ids" }` | `{ "conversation_id", "name" }` |
| POST | `/api/group/:id/members` | `{ "new_member_id" }` | `{ "ok": true }` |
| DELETE | `/api/group/:id/members/:uid` | — | `{ "ok": true }` |
| PATCH | `/api/group/:id` | `{ "name" }` | `{ "ok": true, "name" }` |
| GET | `/api/users/online` | — | `{ "online": ["uuid", ...] }` |
| GET | `/api/users/:uid/last_seen` | — | `{ "last_seen_at": "ISO8601" }` |

### WebSocket — Conexao

| Endpoint | Params | Descricao |
|----------|--------|-----------|
| `ws://localhost:4002/socket` | `?token=<jwt>` | JWT obrigatorio; conexao recusada se invalido |

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

### Pre-requisito
- [ ] Obter `access_token` do auth-service (fora deste doc)
- [ ] Decodificar JWT para extrair `user_id` (claim `sub`) e `username`
- [ ] Verificar expiracao do token e renovar se necessario

### Chat — Conversas diretas
- [ ] Conectar ao WebSocket (`ws://localhost:4002/socket`) com `token=<jwt>`
- [ ] Entrar no `user:{user_id}` — ouvir `new_conversation_message`
- [ ] `GET /api/conversations` (com `Authorization: Bearer`) — listar conversas
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
