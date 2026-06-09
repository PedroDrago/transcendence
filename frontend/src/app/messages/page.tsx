'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import { chat as chatApi, getChatWsUrl, Conversation, Message } from '@/lib/api';
import { decodeJwt, getStoredAppToken } from '@/lib/auth';
import { useTranslations, useLocale } from 'next-intl';
import { PhoenixSocket } from '@/lib/socket';

function timeStr(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString([locale], { hour: '2-digit', minute: '2-digit' });
}

function convLabel(conv: Conversation): string {
  if (conv.type === 'group') return conv.name ?? 'Group';
  return conv.other_user_name ?? 'Direct';
}

function convInitial(conv: Conversation): string {
  return convLabel(conv)[0]?.toUpperCase() ?? '?';
}

// ─── Chat panel ───────────────────────────────────────────

function ChatPanel({
  conv,
  myId,
  socket,
}: {
  conv: Conversation;
  myId: string;
  socket: PhoenixSocket | null;
}) {
  const locale = useLocale();
  const t = useTranslations('Messages');
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [text,       setText]       = useState('');
  const [typing,     setTyping]     = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topic = `chat:${conv.conversation_id}`;

  // Load history + join socket channel
  useEffect(() => {
    setMessages([]);
    chatApi.messages(conv.conversation_id).then((r) => setMessages(r.messages)).catch(() => {});

    if (!socket) return;

    socket.join(topic);
    const unsub = socket.subscribe(topic, (event, payload) => {
      const p = payload as Record<string, unknown>;
      if (event === 'message') {
        setMessages((prev) => [
          ...prev,
          {
            body: p.body as string,
            user_id: p.user_id as string,
            inserted_at: new Date().toISOString(),
          },
        ]);
      }
      if (event === 'typing') {
        const senderId = p.user_id as string;
        if (senderId === myId) return;
        const member = conv.members.find((m) => m.user_id === senderId);
        const name = member?.username ?? senderId.slice(0, 6);
        if (p.is_typing) {
          setTyping((prev) => [...new Set([...prev, name])]);
        } else {
          setTyping((prev) => prev.filter((n) => n !== name));
        }
      }
    });

    return () => {
      unsub();
      setTyping([]);
    };
  }, [conv.conversation_id, topic, socket, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendTyping(is_typing: boolean) {
    socket?.push(topic, 'typing', { is_typing });
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 2_000);
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !socket) return;
    socket.push(topic, 'message', { body });
    setText('');
    sendTyping(false);
  }

  return (
    <>
      <div className="chat-panel-head">
        <Avatar username={convLabel(conv)} size={34} className="conv-avatar" />
        <span className="chat-panel-name">{convLabel(conv)}</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const mine = msg.user_id === myId;
          const member = conv.members.find((m) => m.user_id === msg.user_id);
          return (
            <div key={i} className={`chat-bubble-wrap chat-bubble-wrap--${mine ? 'mine' : 'theirs'}`}>
              {!mine && (
                <span className="chat-bubble-sender">{member?.username ?? msg.user_id.slice(0, 6)}</span>
              )}
              <div className={`chat-bubble chat-bubble--${mine ? 'mine' : 'theirs'}`}>
                {msg.body}
              </div>
              <span className="chat-bubble-time">{timeStr(msg.inserted_at, locale)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-typing">
        {typing.length > 0 && `${typing.join(', ')} ${typing.length === 1 ? 'is' : 'are'} typing…`}
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <input
          className="chat-input"
          value={text}
          onChange={handleInput}
          placeholder={t("typeMessage")}
        />
        <button type="submit" className="app-btn">{t("send")}</button>
      </form>
    </>
  );
}

// ─── Main messages page ───────────────────────────────────

function MessagesContent() {
  const t = useTranslations('Messages');
  const router = useRouter();
  const searchParams = useSearchParams();
  const initUser = searchParams.get('user');

  const myId = decodeJwt(getStoredAppToken())?.sub as string | undefined;

  const [convs,      setConvs]      = useState<Conversation[]>([]);
  const [selected,   setSelected]   = useState<Conversation | null>(null);
  const [socket,     setSocket]     = useState<PhoenixSocket | null>(null);
  const [newUser,    setNewUser]    = useState(initUser ?? '');
  const [newChatErr, setNewChatErr] = useState('');

  // Connect socket
  useEffect(() => {
    const url = getChatWsUrl();
    const sock = new PhoenixSocket(url);
    sock.connect();
    sock.onConnect(() => {
      if (myId) sock.join(`user:${myId}`);
    });
    setSocket(sock);
    return () => sock.disconnect();
  }, [myId]);

  // Load conversations
  useEffect(() => {
    chatApi.conversations().then((r) => setConvs(r.conversations)).catch(() => {});
  }, []);

  // If ?user param, auto-open or create conversation
  useEffect(() => {
    if (!initUser || convs.length === 0) return;
    const existing = convs.find((c) => c.other_user_name === initUser);
    if (existing) {
      setSelected(existing);
    } else {
      chatApi.createDirect(initUser)
        .then((r) => {
          chatApi.conversations().then((res) => {
            setConvs(res.conversations);
            const c = res.conversations.find((x) => x.conversation_id === r.conversation_id);
            if (c) setSelected(c);
          }).catch(() => {});
        })
        .catch(() => {});
    }
    // clear the param
    router.replace('/messages');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initUser, convs.length]);

  async function startNew(e: React.FormEvent) {
    e.preventDefault();
    const name = newUser.trim();
    if (!name) return;
    setNewChatErr('');
    try {
      const r = await chatApi.createDirect(name);
      const res = await chatApi.conversations();
      setConvs(res.conversations);
      const c = res.conversations.find((x) => x.conversation_id === r.conversation_id);
      if (c) setSelected(c);
      setNewUser('');
    } catch (err) {
      setNewChatErr(err instanceof Error ? err.message : 'User not found.');
    }
  }

  return (
    <div className="messages-shell">
      {/* Sidebar */}
      <div className="conv-sidebar">
        <div className="conv-sidebar-head">
          <h2>{t("title")}</h2>
        </div>

        <div className="conv-list">
          {convs.length === 0 && (
            <p className="conv-empty">No conversations yet.</p>
          )}
          {convs.map((c) => (
            <div
              key={c.conversation_id}
              className={`conv-item${selected?.conversation_id === c.conversation_id ? ' conv-item--active' : ''}`}
              onClick={() => setSelected(c)}
            >
              <Avatar username={convLabel(c)} size={42} className="conv-avatar" />
              <div className="conv-info">
                <p className="conv-name">{convLabel(c)}</p>
                {c.last_message && (
                  <p className="conv-last">{c.last_message.body}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <form className="new-chat-form" onSubmit={startNew}>
          <input
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="Username to message…"
          />
          <button type="submit" className="app-btn app-btn--sm">Go</button>
        </form>
        {newChatErr && (
          <p style={{ padding: '4px 16px 10px', fontSize: '0.8rem', color: 'var(--error)' }}>
            {newChatErr}
          </p>
        )}
      </div>

      {/* Chat panel */}
      <div className="chat-panel">
        {selected && myId
          ? <ChatPanel conv={selected} myId={myId} socket={socket} />
          : <p className="chat-placeholder">Select a conversation</p>}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>}>
        <MessagesContent />
      </Suspense>
    </AppShell>
  );
}
