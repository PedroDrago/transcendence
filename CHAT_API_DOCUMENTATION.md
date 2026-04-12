# TranscendenceChat - API Documentation

## Base URL

```
http://localhost:4000
```

---

## REST API

Todos os endpoints retornam JSON. Os endpoints POST recebem JSON no body (`Content-Type: application/json`). Os endpoints GET recebem query parameters.

---

### POST `/api/login`

Cria um novo usuario ou retorna um existente.

**Request:**
```json
{
  "username": "joao"
}
```

**Response (200):**
```json
{
  "user_id": 1
}
```

- Se o username ja existe, retorna o `user_id` existente
- Se nao existe, cria e retorna o novo `user_id`
- Guarde o `user_id` — ele e necessario em todas as outras operacoes

---

### POST `/api/conversation`

Cria ou recupera uma conversa 1-a-1 entre dois usuarios.

**Request:**
```json
{
  "user_id": 1,
  "recipient_name": "maria"
}
```

**Response (200):**
```json
{
  "conversation_id": 5,
  "recipient_id": 2,
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
- Guarde o `conversation_id` para usar no WebSocket

---

### GET `/api/conversations?user_id={id}`

Lista todas as conversas do usuario, com a ultima mensagem de cada.

**Response (200):**
```json
{
  "conversations": [
    {
      "conversation_id": 5,
      "other_user_id": 2,
      "other_user_name": "maria",
      "last_message": {
        "body": "Opa, tudo bem?",
        "user_id": 2,
        "inserted_at": "2026-04-12T10:30:00Z"
      }
    },
    {
      "conversation_id": 8,
      "other_user_id": 3,
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
- `last_message.user_id` indica quem enviou a ultima mensagem (pode ser o proprio usuario ou o outro)
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
      "user_id": 2,
      "inserted_at": "2026-04-12T10:30:00Z"
    },
    {
      "body": "Tudo certo!",
      "user_id": 1,
      "inserted_at": "2026-04-12T10:31:15Z"
    }
  ]
}
```

- Ordenadas da mais antiga para a mais recente
- `user_id` indica quem enviou — compare com o seu `user_id` para distinguir mensagens enviadas/recebidas
- Use para carregar o historico ao abrir uma conversa

---

## WebSocket

A comunicacao em tempo real usa Phoenix Channels sobre WebSocket. Apos o login, conecte ao socket e entre nos channels.

### Conexao

```
ws://localhost:4000/socket?user_id={user_id}
```

```javascript
import { Socket } from "phoenix";

const socket = new Socket("/socket", { params: { user_id: userId } });
socket.connect();
```

O `user_id` passado na conexao identifica o usuario em todos os channels.

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
- Entre neste channel logo apos conectar ao socket

#### Evento recebido: `new_conversation_message`

Disparado quando alguem envia uma mensagem em qualquer conversa do usuario.

```javascript
userChannel.on("new_conversation_message", (payload) => {
  // payload:
  // {
  //   "conversation_id": 5,
  //   "sender_id": 2,
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
  //   "user_id": 1
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
  //   "user_id": 2,
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
  //   "user_id": 1
  // }
});
```

- O remetente **NAO** recebe de volta o proprio evento (usa `broadcast_from`)
- Envie quando:
  - O usuario abre/seleciona uma conversa
  - O usuario recebe uma mensagem na conversa que ja esta aberta/visivel
- Use para mostrar status de leitura (ex: "Lido" / "Enviado") na ultima mensagem enviada

---

## Fluxo completo

```javascript
import { Socket } from "phoenix";

// 1. Login
const res = await fetch("/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "joao" })
});
const { user_id } = await res.json();

// 2. Conectar WebSocket
const socket = new Socket("/socket", { params: { user_id } });
socket.connect();

// 3. Entrar no user channel (notificacoes)
const userChannel = socket.channel(`user:${user_id}`);
userChannel.join();

userChannel.on("new_conversation_message", (msg) => {
  // Ignorar se ja estamos no chat channel dessa conversa
  if (chatChannelsJoined.has(msg.conversation_id)) return;

  // Conversa nova — mostrar notificacao, fazer join no chat channel
  console.log(`${msg.sender_name}: ${msg.body}`);
});

// 4. Listar conversas existentes
const convRes = await fetch(`/api/conversations?user_id=${user_id}`);
const { conversations } = await convRes.json();

// 5. Para cada conversa, fazer join no chat channel
conversations.forEach((conv) => {
  const ch = socket.channel(`chat:${conv.conversation_id}`);
  ch.join();

  ch.on("message", (msg) => { /* renderizar mensagem */ });
  ch.on("typing", (data) => { /* mostrar/esconder indicador */ });
  ch.on("messages_read", (data) => { /* atualizar status de leitura */ });
});

// 6. Criar conversa nova
const newConvRes = await fetch("/api/conversation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user_id, recipient_name: "maria" })
});
const { conversation_id } = await newConvRes.json();

// 7. Carregar historico
const msgsRes = await fetch(`/api/messages?conversation_id=${conversation_id}`);
const { messages } = await msgsRes.json();

// 8. Entrar no chat channel da nova conversa
const chatChannel = socket.channel(`chat:${conversation_id}`);
chatChannel.join();

// 9. Enviar mensagem
chatChannel.push("message", { body: "Opa, tudo bem?" });

// 10. Indicar digitacao
chatChannel.push("typing", { is_typing: true });

// 11. Confirmar leitura
chatChannel.push("messages_read", {});
```

---

## Tabela de referencia rapida

### REST

| Metodo | Rota | Body / Params | Response |
|--------|------|---------------|----------|
| POST | `/api/login` | `{ "username": "..." }` | `{ "user_id": 1 }` |
| POST | `/api/conversation` | `{ "user_id": 1, "recipient_name": "..." }` | `{ "conversation_id": 5, "recipient_id": 2, "recipient_name": "..." }` |
| GET | `/api/conversations` | `?user_id=1` | `{ "conversations": [...] }` |
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

- [ ] `POST /api/login` — fazer login e guardar `user_id`
- [ ] Conectar ao WebSocket com `user_id`
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
