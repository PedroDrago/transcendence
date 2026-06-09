'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import PostCard from '@/components/PostCard';
import { posts as postsApi, users as usersApi, Post, UserProfile } from '@/lib/api';

// ─── New post modal ────────────────────────────────────────

function NewPostModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Post) => void }) {
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [caption,  setCaption]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Select a file first.'); return; }
    setLoading(true);
    setError('');
    try {
      const { url, key } = await postsApi.presignUrl('post', file.type);
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const post = await postsApi.create(key, caption || undefined);
      onCreated(post);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>New post</h2>
        <form onSubmit={submit}>
          <div className="modal-field">
            <span>Photo or video</span>
            <input type="file" accept="image/*,video/mp4" onChange={pickFile} />
          </div>
          {preview && file?.type.startsWith('image') && (
            <img className="modal-preview" src={preview} alt="preview" />
          )}
          <div className="modal-field">
            <span>Caption</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write something…"
              maxLength={2200}
            />
          </div>
          {error && <p className="modal-msg">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="app-btn app-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="app-btn" disabled={loading}>
              {loading ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Feed page ────────────────────────────────────────────

export default function FeedPage() {
  const [postsList, setPostsList]   = useState<Post[]>([]);
  const [profiles,  setProfiles]    = useState<Record<string, UserProfile>>({});
  const [cursor,    setCursor]      = useState<string | undefined>(undefined);
  const [loading,   setLoading]     = useState(false);
  const [exhausted, setExhausted]   = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || exhausted) return;
    setLoading(true);
    try {
      const page = await postsApi.feed(cursor);
      if (page.posts.length === 0 || !page.nextCursor) setExhausted(true);

      setPostsList((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !ids.has(p.id))];
      });
      setCursor(page.nextCursor ?? undefined);

      const unknownIds = [...new Set(page.posts.map((p) => p.userId))].filter(
        (id) => !profiles[id],
      );
      if (unknownIds.length) {
        const results = await Promise.allSettled(unknownIds.map((id) => usersApi.get(id)));
        setProfiles((prev) => {
          const next = { ...prev };
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') next[unknownIds[i]] = r.value;
          });
          return next;
        });
      }
    } catch {}
    setLoading(false);
  }, [cursor, exhausted, loading, profiles]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  function handleCreated(post: Post) {
    setPostsList((prev) => [post, ...prev]);
  }

  return (
    <AppShell>
      <div className="feed-wrap">
        <div className="feed-topbar">
          <span className="feed-title">Feed</span>
          <button className="app-btn" onClick={() => setShowModal(true)}>+ New post</button>
        </div>

        {postsList.map((post) => (
          <PostCard key={post.id} post={post} author={profiles[post.userId]} />
        ))}

        <div ref={loaderRef} className="feed-loader">
          {loading && <span className="spinner" />}
          {!loading && exhausted && postsList.length === 0 && (
            <p className="feed-empty">
              Your feed is empty.<br />
              Add friends to see their posts here, or share your first post.
            </p>
          )}
          {!loading && exhausted && postsList.length > 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>You're all caught up.</p>
          )}
        </div>
      </div>

      {showModal && (
        <NewPostModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </AppShell>
  );
}
