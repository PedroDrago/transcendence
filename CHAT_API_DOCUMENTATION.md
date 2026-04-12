# 💬 TranscendenceChat - Documentação da API

Este documento contém todas as rotas, endpoints e eventos WebSocket necessários para implementar o frontend do serviço de chat.

## 🌐 Base URL

```
http://localhost:4000
```

---

## 📡 REST API Endpoints

### 1. **Login / Criar Usuário**

Cria um novo usuário ou retorna um existente caso ele já exista.

| Propriedade | Valor |
|---|---|
| **Método** | POST |
| **Rota** | `/api/login` |
| **Body** | `{"username": "joao"}` (JSON) |

**Exemplo de Request:**
```
POST /api/login
Content-Type: application/json

{"username": "joao"}
```

**Response (200 OK):**
```json
{
  "user_id": 1
}
```

**Notas:**
- O `username` será criado se não existir
- Retorna o mesmo `user_id` em chamadas subsequentes com o mesmo `username`
- Guarde o `user_id` - você vai precisar em todas as outras requisições

---

### 2. **Criar ou Recuperar Conversa**

Obtém uma conversa existente com outro usuário ou cria uma nova.

| Propriedade | Valor |
|---|---|
| **Método** | POST |
| **Rota** | `/api/conversation` |
| **Body** | `{"user_id": 1, "recipient_name": "maria"}` (JSON) |

**Exemplo de Request:**
```
POST /api/conversation
Content-Type: application/json

{"user_id": 1, "recipient_name": "maria"}
```

**Response (200 OK):**
```json
{
  "conversation_id": 5,
  "recipient_id": 2,
  "recipient_name": "maria"
}
```

**Response (200 - User Not Found):**
```json
{
  "error": "User not found"
}
```

**Notas:**
- Se a conversa já existe, ela é retornada
- Se não existe, é criada automaticamente
- Guarde o `conversation_id` para conectar no WebSocket

---

### 3. **Listar Conversas do Usuário**

Retorna todas as conversas do usuário com a última mensagem de cada uma.

| Propriedade | Valor |
|---|---|
| **Método** | GET |
| **Rota** | `/api/conversations` |
| **Parâmetros** | `user_id` (number) |

**Exemplo de Request:**
```
GET /api/conversations?user_id=1
```

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "id": 5,
      "last_message": "Opa, tudo bem?",
      "other_user_id": 2,
      "other_user_name": "maria",
      "inserted_at": "2026-04-12T10:30:00Z",
      "updated_at": "2026-04-12T14:45:22Z"
    },
    {
      "id": 8,
      "last_message": "Até mais tarde!",
      "other_user_id": 3,
      "other_user_name": "pedro",
      "inserted_at": "2026-04-11T08:15:00Z",
      "updated_at": "2026-04-11T16:20:55Z"
    }
  ]
}
```

**Notas:**
- Use este endpoint para popular a lista de conversas na sidebar/lista
- `other_user_id` e `other_user_name` são do outro participante da conversa
- Conversas são ordenadas por `updated_at` (mais recentes primeiro)

---

### 4. **Listar Mensagens de uma Conversa**

Retorna todas as mensagens de uma conversa específica.

| Propriedade | Valor |
|---|---|
| **Método** | GET |
| **Rota** | `/api/messages` |
| **Parâmetros** | `conversation_id` (number) |

**Exemplo de Request:**
```
GET /api/messages?conversation_id=5
```

**Response (200 OK):**
```json
{
  "messages": [
    {
      "body": "Opa, tudo bem?",
      "user_id": 2,
      "inserted_at": "2026-04-12T10:30:00Z"
    },
    {
      "body": "Tudo certo, e com você?",
      "user_id": 1,
      "inserted_at": "2026-04-12T10:31:15Z"
    },
    {
      "body": "Tranquilo, bora conversar?",
      "user_id": 2,
      "inserted_at": "2026-04-12T10:32:45Z"
    }
  ]
}
```

**Notas:**
- Mensagens são retornadas em ordem cronológica (mais antigas primeiro)
- `user_id` indica quem enviou a mensagem
- Use este endpoint para carregar o histórico de mensagens quando abre uma conversa

---

## 🔌 WebSocket - Conectar e Autenticar

O WebSocket é usado para comunicação em tempo real. Você precisa conectar após fazer login.

### **URL do WebSocket:**
```
ws://localhost:4000/socket?user_id=YOUR_USER_ID
```

**Exemplo JavaScript:**
```javascript
const userId = 1; // Obtido do /api/login
const socket = new Phoenix.Socket(`ws://localhost:4000/socket?user_id=${userId}`, {
  params: { user_id: userId }
});

socket.connect();
```

---

## 📨 WebSocket - Channels e Eventos

### **1. Chat Channel** 💬

Usado para enviar e receber mensagens em tempo real em uma conversa específica.

#### **Conectar ao Channel:**

```javascript
const conversationId = 5; // Obtido do /api/conversation
const channel = socket.channel(`chat:${conversationId}`);

channel.join()
  .receive("ok", () => {
    console.log("Conectado à conversa!");
  })
  .receive("error", (err) => {
    console.log("Erro ao conectar:", err);
  });
```

**Resposta de Erro (Unauthorized):**
```json
{
  "reason": "unauthorized"
}
```

#### **Enviar Mensagem:**

```javascript
channel.push("message", { body: "Olá, como vai?" })
  .receive("ok", () => console.log("Mensagem enviada!"))
  .receive("error", (err) => console.log("Erro:", err));
```

#### **Receber Mensagens (broadcasts in real-time):**

```javascript
channel.on("message", (payload) => {
  console.log("Nova mensagem:", payload);
  // payload:
  // {
  //   "body": "Olá, como vai?",
  //   "user_id": 2
  // }
});
```

**Notas:**
- Quando uma mensagem é enviada, todos os usuários conectados neste channel recebem o evento `"message"`
- Você precisa estar conectado neste channel para enviar/receber mensagens da conversa

---

### **2. User Channel** 👤

Usado para receber notificações quando alguém envia mensagem em qualquer conversa que você participa.

#### **Conectar ao Channel:**

```javascript
const channel = socket.channel(`user:${userId}`);

channel.join()
  .receive("ok", () => {
    console.log("Conectado às notificações!");
  })
  .receive("error", (err) => {
    console.log("Erro ao conectar:", err);
  });
```

#### **Receber Notificações de Novas Mensagens:**

```javascript
channel.on("new_conversation_message", (payload) => {
  console.log("Nova mensagem em uma conversa:", payload);
  // payload:
  // {
  //   "conversation_id": 5,
  //   "sender_id": 2,
  //   "sender_name": "maria",
  //   "body": "Opa, respondeu!"
  // }
});
```

**Notas:**
- Este evento é disparado quando alguém envia uma mensagem em uma conversa que você participa
- Útil para notificar o usuário de mensagens chegando em conversas que ele NÃO está visualizando
- Você está sempre conectado a este channel para receber notificações

---

## 🔄 Fluxo de Exemplo Completo

### **Cenário: Usuário João inicia uma conversa com Maria e envia mensagens**

```javascript
// 1. Login
const response1 = await fetch("/api/login", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({username: "joao"})
});
const { user_id } = await response1.json();
console.log("Seu ID:", user_id); // 1

// 2. Conectar ao WebSocket
const socket = new Phoenix.Socket(`ws://localhost:4000/socket?user_id=${user_id}`, {
  params: { user_id }
});
socket.connect();

// 3. Conectar ao seu User Channel para receber notificações
const userChannel = socket.channel(`user:${user_id}`);
userChannel.join();

userChannel.on("new_conversation_message", (msg) => {
  console.log(`${msg.sender_name} enviou: ${msg.body}`);
  // Mostrar notificação/badge na UI
});

// 4. Obter ou criar conversa com Maria
const response2 = await fetch("/api/conversation", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({user_id: 1, recipient_name: "maria"})
});
const { conversation_id, recipient_name } = await response2.json();
console.log(`Conversa com ${recipient_name}:`, conversation_id); // 5

// 5. Carregar histórico de mensagens
const response3 = await fetch("/api/messages?conversation_id=5");
const { messages } = await response3.json();
console.log("Mensagens antigas:", messages);

// 6. Conectar ao Chat Channel da conversa
const chatChannel = socket.channel(`chat:${conversation_id}`);
chatChannel.join();

// 7. Receber mensagens em tempo real
chatChannel.on("message", (msg) => {
  console.log(`${msg.user_id === user_id ? "Você" : "Outro"}: ${msg.body}`);
});

// 8. Enviar nova mensagem
chatChannel.push("message", { body: "Opa, tudo bem?" })
  .receive("ok", () => console.log("Mensagem enviada!"));

// 9. Listar todas as conversas (para atualizar sidebar)
const response4 = await fetch("/api/conversations?user_id=1");
const { conversations } = await response4.json();
console.log("Suas conversas:", conversations);
```

---

## 🛠️ Implementação com Phoenix JavaScript Client

Se você usar a biblioteca JS oficial do Phoenix (recomendado):

```html
<script src="/assets/phoenix.js"></script>
<script>
  import { Socket } from "phoenix";
  
  const userId = 1;
  const socket = new Socket("/socket", { params: { user_id: userId } });
  socket.connect();

  // Rest do código...
</script>
```

---

## ⚠️ Considerações Importantes

### **Parâmetros de Query String**
- Todos os endpoints REST usam **query parameters** (não body)
- IDs numéricos devem ser convertidos de string

### **Timestamps**
- Todos os timestamps estão em ISO 8601 (UTC)
- Formato: `"2026-04-12T14:45:22Z"`

### **Autorização**
- O `user_id` é extraído dos parâmetros de conexão WebSocket
- Você só pode jogar em canais que pertencem ao seu `user_id`
- Você só pode enviar mensagens em conversas das quais você é membro

### **Conversas 1-to-1**
- Cada conversa tem exatamente 2 participantes
- Não há suporte a grupo de chats

### **Tratamento de Erros**
- Erros de autorização retornam `{reason: "unauthorized"}`
- Erros de user not found retornam `{error: "User not found"}`

---

## 📋 Checklist de Implementação

- [ ] Fazer login: `POST /api/login` com body `{"username": "..."}`
- [ ] Conectar ao WebSocket com `user_id`
- [ ] Jogar no User Channel: `user:${user_id}`
- [ ] Listar conversas: `GET /api/conversations?user_id=...`
- [ ] Criar/obter conversa: `POST /api/conversation` com body `{"user_id": ..., "recipient_name": "..."}`
- [ ] Carregar histórico: `GET /api/messages?conversation_id=...`
- [ ] Jogar no Chat Channel: `chat:${conversation_id}`
- [ ] Enviar mensagem: `channel.push("message", {body: "..."})`
- [ ] Receber mensagens: `channel.on("message", ...)`
- [ ] Receber notificações: `userChannel.on("new_conversation_message", ...)`

---

## 📞 Suporte

Qualquer dúvida sobre as rotas ou implementação, consulte o código-fonte:
- Controllers: `lib/transcendence_chat_web/controllers/`
- Channels: `lib/transcendence_chat_web/channels/`
- Router: `lib/transcendence_chat_web/router.ex`
