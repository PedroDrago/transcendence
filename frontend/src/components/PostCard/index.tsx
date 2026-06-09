'use client';

import { useState } from 'react';
import { Post, UserProfile, posts as postsApi, Comment, users as usersApi } from '@/lib/api';
import { decodeJwt, getStoredAppToken } from '@/lib/auth';
import Avatar from '@/components/Avatar';

interface Props {
  post: Post;
  author?: UserProfile;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PostCard({ post, author }: Props) {
  const myId = decodeJwt(getStoredAppToken())?.sub as string | undefined;

  const [liked,     setLiked]     = useState(false);
  const [likeId,    setLikeId]    = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments,  setComments]  = useState<Comment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, UserProfile>>({});
  const [commentText, setCommentText] = useState('');
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  async function toggleLike() {
    if (liked && likeId) {
      try {
        await postsApi.unlike(likeId);
        setLiked(false);
        setLikeId(null);
        setLikeCount((n) => n - 1);
      } catch {}
    } else if (!liked) {
      try {
        const like = await postsApi.like(post.id);
        setLiked(true);
        setLikeId(like.id);
        setLikeCount((n) => n + 1);
      } catch {}
    }
  }

  async function openComments() {
    setShowComments((v) => !v);
    if (commentsLoaded) return;
    try {
      const page = await postsApi.comments(post.id);
      setComments(page.comments);
      setCommentsLoaded(true);

      const unknownIds = [...new Set(page.comments.map((c) => c.userId))].filter(
        (id) => !commentAuthors[id],
      );
      if (unknownIds.length) {
        const results = await Promise.allSettled(unknownIds.map((id) => usersApi.get(id)));
        setCommentAuthors((prev) => {
          const next = { ...prev };
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') next[unknownIds[i]] = r.value;
          });
          return next;
        });
      }
    } catch {}
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    try {
      const created = await postsApi.addComment(post.id, content);
      setComments((prev) => [created, ...prev]);
      setCommentText('');
      setCommentCount((n) => n + 1);
    } catch {}
  }

  return (
    <article className="post-card">
      <header className="post-card-header">
        <Avatar username={author?.username ?? post.userId.slice(0, 8)} avatarUrl={author?.avatarUrl} size={38} className="post-card-avatar" />
        <div className="post-card-author">
          <p className="post-card-username">{author?.username ?? post.userId.slice(0, 8)}</p>
          <p className="post-card-time">{timeAgo(post.createdAt)}</p>
        </div>
      </header>

      {post.mediaType === 'video' ? (
        <video className="post-card-media" src={post.mediaUrl} controls playsInline />
      ) : (
        <img className="post-card-media" src={post.mediaUrl} alt={post.caption ?? ''} loading="lazy" />
      )}

      <footer className="post-card-footer">
        {post.caption && <p className="post-card-caption">{post.caption}</p>}

        <div className="post-card-actions">
          <button
            className={`post-card-action${liked ? ' post-card-action--active' : ''}`}
            onClick={toggleLike}
            title={liked ? 'Unlike' : 'Like'}
          >
            <span>{liked ? '♥' : '♡'}</span>
            <span>{likeCount}</span>
          </button>
          <button className="post-card-action" onClick={openComments}>
            <span>◯</span>
            <span>{commentCount}</span>
          </button>
        </div>
      </footer>

      {showComments && (
        <div className="comments-sheet">
          {comments.length > 0 && (
            <div className="comments-list">
              {comments.map((c) => {
                const ca = commentAuthors[c.userId];
                return (
                  <div key={c.id} className="comment-item">
                    <Avatar username={ca?.username ?? c.userId.slice(0, 6)} avatarUrl={ca?.avatarUrl} size={28} className="comment-avatar" />
                    <div className="comment-body">
                      <span className="comment-username">{ca?.username ?? c.userId.slice(0, 6)}</span>
                      <span className="comment-content">{c.content}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {myId && (
            <form className="comment-form" onSubmit={submitComment}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
              />
              <button type="submit" className="app-btn app-btn--sm">Post</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
