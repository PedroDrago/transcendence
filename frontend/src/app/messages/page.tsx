'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import {
  chat as chatApi,
  users as usersApi,
  getChatWsUrl,
  Conversation,
  Message,
  UserProfile,
} from '@/lib/api';
import { useMyId } from '@/lib/hooks';
import { useTranslations, useLocale } from 'next-intl';
import { PhoenixSocket } from '@/lib/socket';

function timeStr(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString([locale], { hour: '2-digit', minute: '2-digit' });
}

function convLabel(conv: Conversation): string {
  if (conv.type === 'group') return conv.name ?? 'Group';
  return conv.other_user_name ?? 'Direct';
}

// ─── New conversation modal ────────────────────────────────

type ModalStep = 'choice' | 'direct' | 'group';

function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (convId: number) => void;
}) {
  const [step,        setStep]       = useState<ModalStep>('choice');
  const [friends,     setFriends]    = useState<UserProfile[]>([]);
  const [search,      setSearch]     = useState('');
  const [groupName,   setGroupName]  = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy,        setBusy]       = useState(false);
  const [err,         setErr]        = useState('');

  useEffect(() => {
    usersApi.friends().then(setFriends).catch(() => {});
  }, []);

  const filtered = friends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()),
  );

  async function pickDirect(friend: UserProfile) {
    setBusy(true);
    setErr('');
    try {
      const r = await chatApi.createDirect(friend.username);
      onCreated(r.conversation_id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createGroup() {
    const name = groupName.trim();
    if (!name || selectedIds.size === 0) return;
    setBusy(true);
    setErr('');
    try {
      const r = await chatApi.createGroup(name, [...selectedIds]);
      onCreated(r.conversation_id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal conv-new-modal" onClick={(e) => e.stopPropagation()}>

        {step === 'choice' && (
          <>
            <h2>New Conversation</h2>
            <div className="conv-modal-choice">
              <button className="conv-modal-choice-btn" onClick={() => setStep('direct')}>
                <span className="conv-modal-choice-icon">✉</span>
                Direct Message
              </button>
              <button className="conv-modal-choice-btn" onClick={() => setStep('group')}>
                <span className="conv-modal-choice-icon">#</span>
                Group Chat
              </button>
            </div>
            <div className="modal-actions">
              <button className="app-btn app-btn--ghost app-btn--sm" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'direct' && (
          <>
            <h2>Direct Message</h2>
            <div className="modal-field">
              <span>Friends</span>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends…"
              />
            </div>
            <div className="conv-friend-list">
              {filtered.length === 0 && <p className="conv-empty">No friends found</p>}
              {filtered.map((f) => (
                <button
                  key={f.id}
                  className="conv-friend-item"
                  onClick={() => pickDirect(f)}
                  disabled={busy}
                >
                  <Avatar username={f.username} size={32} className="conv-avatar" />
                  <span className="conv-friend-item-name">{f.username}</span>
                </button>
              ))}
            </div>
            {err && <p className="modal-msg">{err}</p>}
            <div className="modal-actions">
              <button
                className="app-btn app-btn--ghost app-btn--sm"
                onClick={() => { setStep('choice'); setSearch(''); setErr(''); }}
              >
                Back
              </button>
            </div>
          </>
        )}

        {step === 'group' && (
          <>
            <h2>New Group</h2>
            <div className="modal-field">
              <span>Group Name</span>
              <input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="My Group…"
              />
            </div>
            <div className="modal-field">
              <span>
                Members{selectedIds.size > 0 ? ` — ${selectedIds.size} selected` : ''}
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends…"
              />
            </div>
            <div className="conv-friend-list">
              {filtered.length === 0 && <p className="conv-empty">No friends found</p>}
              {filtered.map((f) => (
                <button
                  key={f.id}
                  className={`conv-friend-item${selectedIds.has(f.id) ? ' conv-friend-item--selected' : ''}`}
                  onClick={() => toggleMember(f.id)}
                >
                  <Avatar username={f.username} size={32} className="conv-avatar" />
                  <span className="conv-friend-item-name">{f.username}</span>
                  {selectedIds.has(f.id) && <span className="conv-friend-item-check">✓</span>}
                </button>
              ))}
            </div>
            {err && <p className="modal-msg">{err}</p>}
            <div className="modal-actions">
              <button
                className="app-btn app-btn--ghost app-btn--sm"
                onClick={() => { setStep('choice'); setSearch(''); setErr(''); setSelectedIds(new Set()); }}
              >
                Back
              </button>
              <button
                className="app-btn app-btn--sm"
                onClick={createGroup}
                disabled={busy || !groupName.trim() || selectedIds.size === 0}
              >
                Create
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [text,     setText]     = useState('');
  const [typing,   setTyping]   = useState<string[]>([]);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topic = `chat:${conv.conversation_id}`;

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
          { body: p.body as string, user_id: p.user_id as string, inserted_at: new Date().toISOString() },
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
    return () => { unsub(); setTyping([]); };
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

  const otherMembers = conv.members.filter((m) => m.user_id !== myId);

  return (
    <>
      <div className="chat-panel-head">
        <Avatar username={convLabel(conv)} size={34} className="conv-avatar" />
        <div className="chat-panel-info">
          <span className="chat-panel-name">{convLabel(conv)}</span>
          {conv.type === 'group' && otherMembers.length > 0 && (
            <span className="chat-panel-members">
              {otherMembers.map((m) => m.username).join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const mine = msg.user_id === myId;
          const member = conv.members.find((m) => m.user_id === msg.user_id);
          return (
            <div key={i} className={`chat-bubble-wrap chat-bubble-wrap--${mine ? 'mine' : 'theirs'}`}>
              {!mine && (
                <span className="chat-bubble-sender">
                  {member?.username ?? msg.user_id.slice(0, 6)}
                </span>
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
        {typing.length > 0 &&
          `${typing.join(', ')} ${typing.length === 1 ? 'is' : 'are'} typing…`}
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <input
          className="chat-input"
          value={text}
          onChange={handleInput}
          placeholder={t('typeMessage')}
        />
        <button type="submit" className="app-btn">{t('send')}</button>
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

  const myId = useMyId();

  const [convs,     setConvs]     = useState<Conversation[]>([]);
  const [selected,  setSelected]  = useState<Conversation | null>(null);
  const [socket,    setSocket]    = useState<PhoenixSocket | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      chatApi
        .createDirect(initUser)
        .then((r) => {
          chatApi.conversations().then((res) => {
            setConvs(res.conversations);
            const c = res.conversations.find((x) => x.conversation_id === r.conversation_id);
            if (c) setSelected(c);
          }).catch(() => {});
        })
        .catch(() => {});
    }
    router.replace('/messages');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initUser, convs.length]);

  async function handleCreated(convId: number) {
    const res = await chatApi.conversations();
    setConvs(res.conversations);
    const c = res.conversations.find((x) => x.conversation_id === convId);
    if (c) setSelected(c);
  }

  return (
    <div className="messages-shell">
      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => { handleCreated(id); setShowModal(false); }}
        />
      )}

      {/* Sidebar */}
      <div className="conv-sidebar">
        <div className="conv-sidebar-head">
          <h2>{t('title')}</h2>
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
                <div className="conv-name-row">
                  <p className="conv-name">{convLabel(c)}</p>
                  {c.type === 'group' && <span className="conv-type-tag">group</span>}
                </div>
                {c.last_message && <p className="conv-last">{c.last_message.body}</p>}
              </div>
            </div>
          ))}
        </div>

        <button
          className="conv-fab"
          onClick={() => setShowModal(true)}
          aria-label="New conversation"
        >
          +
        </button>
      </div>

      {/* Chat panel */}
      <div className="chat-panel">
        {selected && myId ? (
          <ChatPanel conv={selected} myId={myId} socket={socket} />
        ) : (
          <p className="chat-placeholder">Select a conversation</p>
        )}
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
