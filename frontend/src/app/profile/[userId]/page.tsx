'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PostCard from '@/components/PostCard';
import {
  users as usersApi,
  posts as postsApi,
  UserProfile,
  Post,
  FriendRequest,
} from '@/lib/api';
import { decodeJwt, getStoredAppToken } from '@/lib/auth';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: rawId } = use(params);
  const router = useRouter();

  const myId = decodeJwt(getStoredAppToken())?.sub as string | undefined;
  const isSelf = rawId === myId;

  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [cursor,   setCursor]   = useState<string | undefined>(undefined);
  const [exhausted, setExhausted] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setProfile(null);
      setPostsList([]);
      setCursor(undefined);
      setExhausted(false);
      try {
        const [p, postsPage] = await Promise.all([
          usersApi.get(rawId),
          postsApi.userPosts(rawId),
        ]);
        setProfile(p);
        setPostsList(postsPage.posts);
        setCursor(postsPage.nextCursor ?? undefined);
        if (!postsPage.nextCursor) setExhausted(true);
      } catch {
        router.replace('/feed');
        return;
      }

      if (!isSelf && myId) {
        try {
          const friends = await usersApi.friends();
          if (friends.some((f) => f.id === rawId)) {
            setFriendStatus('friends');
          }
          // Note: getPendingRequests only returns incoming requests (where I am the addressee),
          // so outgoing pending requests are tracked in session state via sendFriendRequest.
        } catch {}
      }

      setLoading(false);
    }
    load();
  }, [rawId, isSelf, myId, router]);

  async function loadMore() {
    if (loadingMore || exhausted || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await postsApi.userPosts(rawId, cursor);
      setPostsList((prev) => [...prev, ...page.posts]);
      setCursor(page.nextCursor ?? undefined);
      if (!page.nextCursor) setExhausted(true);
    } catch {}
    setLoadingMore(false);
  }

  async function sendFriendRequest() {
    try {
      await usersApi.sendFriendRequest(rawId);
      setFriendStatus('pending');
    } catch (err) {
      // If a request already exists (409 conflict), still show pending state
      if (err instanceof Error && err.message.toLowerCase().includes('already')) {
        setFriendStatus('pending');
      }
    }
  }

  async function removeFriend() {
    try {
      await usersApi.removeFriend(rawId);
      setFriendStatus('none');
    } catch {}
  }

  async function startChat() {
    if (!profile) return;
    try {
      router.push(`/messages?user=${profile.username}`);
    } catch {}
  }

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <span className="spinner" />
        </div>
      </AppShell>
    );
  }

  if (!profile) return null;

  return (
    <AppShell>
      <div className="profile-wrap">
        {/* Header */}
        <header className="profile-header">
          <div className="profile-avatar">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt={profile.username} />
              : profile.username[0].toUpperCase()}
          </div>

          <div className="profile-meta">
            <h1 className="profile-username">{profile.username}</h1>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            {profile.websiteUrl && (
              <a
                className="profile-website"
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {profile.websiteUrl}
              </a>
            )}
            <div className="profile-stats">
              <span className="profile-stat">
                <strong>{postsList.length}{!exhausted ? '+' : ''}</strong> posts
              </span>
            </div>
          </div>

          <div className="profile-actions">
            {isSelf && (
              <button className="app-btn app-btn--ghost" onClick={() => router.push('/settings')}>
                Edit profile
              </button>
            )}
            {!isSelf && friendStatus === 'none' && (
              <button className="app-btn" onClick={sendFriendRequest}>Add friend</button>
            )}
            {!isSelf && friendStatus === 'pending' && (
              <button className="app-btn app-btn--ghost" disabled>
                Request sent
              </button>
            )}
            {!isSelf && friendStatus === 'friends' && (
              <button className="app-btn app-btn--ghost" onClick={removeFriend}>Friends</button>
            )}
            {!isSelf && (
              <button className="app-btn app-btn--ghost" onClick={startChat}>Message</button>
            )}
          </div>
        </header>

        {/* Posts grid */}
        <div className="profile-grid">
          {postsList.map((post) => (
            <div
              key={post.id}
              className="profile-thumb"
              onClick={() => setSelectedPost(post)}
            >
              {post.mediaType === 'video'
                ? <video src={post.mediaUrl} />
                : <img src={post.mediaUrl} alt={post.caption ?? ''} loading="lazy" />}
            </div>
          ))}
          {postsList.length === 0 && (
            <p className="profile-empty">No posts yet.</p>
          )}
        </div>

        {!exhausted && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="app-btn app-btn--ghost" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Post lightbox */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <PostCard post={selectedPost} author={profile} />
            <button
              className="app-btn app-btn--ghost app-btn--sm"
              style={{ marginTop: 12 }}
              onClick={() => setSelectedPost(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
