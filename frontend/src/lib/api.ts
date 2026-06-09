import { getStoredAuthBase, getStoredAppToken } from './auth';

function resolveUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${getStoredAuthBase()}${path}`;
}

function resolveProfile(user: UserProfile): UserProfile {
  return { ...user, avatarUrl: resolveUrl(user.avatarUrl) };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getStoredAuthBase();
  const token = getStoredAppToken();
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  return body as T;
}

// --- Auth ---
export const auth = {
  login: (identifier: string, password: string) =>
    req<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  register: (username: string, email: string, password: string) =>
    req<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  changeUsername: (username: string) =>
    req<User>('/auth/username', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    }),
  get2faStatus: () =>
    req<{ isTwoFactorEnabled: boolean }>('/auth/2fa/status'),
  generate2fa: () =>
    req<{ qrCodeDataUrl: string }>('/auth/2fa/generate', { method: 'POST' }),
  turnOn2fa: (code: string) =>
    req<{ message: string }>('/auth/2fa/turn-on', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  turnOff2fa: (code: string) =>
    req<{ message: string }>('/auth/2fa/turn-off', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

// --- Users ---
export const users = {
  me: () => req<UserProfile>('/users/me').then(resolveProfile),
  get: (id: string) => req<UserProfile>(`/users/${id}`).then(resolveProfile),
  updateMe: (data: { bio?: string; websiteUrl?: string }) =>
    req<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }).then(resolveProfile),
  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return req<UserProfile>('/users/me/avatar', { method: 'PATCH', body: form }).then(resolveProfile);
  },
  friends: () => req<UserProfile[]>('/users/friends').then((list) => list.map(resolveProfile)),
  friendRequests: () =>
    req<FriendRequest[]>('/users/friends/requests').then((list) =>
      list.map((r) => ({ ...r, requester: resolveProfile(r.requester) })),
    ),
  friendIds: () => req<string[]>('/users/friends/my/ids'),
  sendFriendRequest: (addresseeId: string) =>
    req<FriendRequest>('/users/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ addresseeId }),
    }),
  respondFriendRequest: (id: string, status: 'ACCEPTED' | 'REJECTED') =>
    req<FriendRequest>(`/users/friends/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  removeFriend: (id: string) => req<void>(`/users/friends/${id}`, { method: 'DELETE' }),
  block: (blockedId: string) =>
    req<void>('/users/blocks', { method: 'POST', body: JSON.stringify({ blockedId }) }),
  unblock: (blockedId: string) => req<void>(`/users/blocks/${blockedId}`, { method: 'DELETE' }),
  blocks: () => req<{ blocks: string[] }>('/users/blocks'),
  blockStatus: (targetId: string) =>
    req<{ isBlocked: boolean }>(`/users/blocks/${targetId}/status`),
  exportData: () => req<any>('/users/me/export'),
  importData: (data: any) =>
    req<UserProfile>('/users/me/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// --- Posts ---
export const posts = {
  feed: (cursor?: string, limit = 20) =>
    req<FeedPage>(`/posts/feed?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  userPosts: (userId: string, cursor?: string, limit = 20) =>
    req<FeedPage>(
      `/users/${userId}/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  get: (postId: string) => req<Post>(`/posts/${postId}`),
  presignUrl: (context: 'post' | 'story', contentType: string) =>
    req<{ url: string; key: string; expiresIn: number }>('/presign-url', {
      method: 'POST',
      body: JSON.stringify({ context, contentType }),
    }),
  create: (key: string, caption?: string) =>
    req<Post>('/posts', { method: 'POST', body: JSON.stringify({ key, caption }) }),
  update: (postId: string, caption: string) =>
    req<Post>(`/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ caption }) }),
  delete: (postId: string) => req<void>(`/posts/${postId}`, { method: 'DELETE' }),
  like: (postId: string) => req<Like>(`/posts/${postId}/likes`, { method: 'POST' }),
  unlike: (likeId: string) => req<void>(`/likes/${likeId}`, { method: 'DELETE' }),
  likesCount: (postId: string) => req<{ count: number }>(`/posts/${postId}/likes/count`),
  comments: (postId: string, cursor?: string) =>
    req<CommentPage>(
      `/posts/${postId}/comments${cursor ? `?cursor=${cursor}` : ''}`,
    ),
  addComment: (postId: string, content: string) =>
    req<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  deleteComment: (commentId: string) =>
    req<void>(`/comments/${commentId}`, { method: 'DELETE' }),
};

// --- Stories ---
export const stories = {
  userStories: (userId: string) =>
    req<{ stories: Story[]; nextCursor: string | null }>(`/users/${userId}/stories`),
  get: (storyId: string) => req<Story>(`/stories/${storyId}`),
  create: (key: string) =>
    req<Story>('/stories', { method: 'POST', body: JSON.stringify({ key }) }),
  delete: (storyId: string) => req<void>(`/stories/${storyId}`, { method: 'DELETE' }),
  like: (storyId: string) => req<Like>(`/stories/${storyId}/likes`, { method: 'POST' }),
};

// --- Chat REST (routed through gateway as /chat/* → chat-service /api/*) ---
export const chat = {
  conversations: () => req<{ conversations: Conversation[] }>('/chat/conversations'),
  messages: (conversationId: number) =>
    req<{ messages: Message[] }>(`/chat/messages?conversation_id=${conversationId}`),
  createDirect: (recipientName: string) =>
    req<{ conversation_id: number; recipient_id: string; recipient_name: string }>(
      '/chat/conversation',
      { method: 'POST', body: JSON.stringify({ recipient_name: recipientName }) },
    ),
  createGroup: (name: string, memberIds: string[]) =>
    req<{ conversation_id: number; name: string }>('/chat/group', {
      method: 'POST',
      body: JSON.stringify({ name, member_ids: memberIds }),
    }),
  onlineUsers: () => req<{ online: string[] }>('/chat/users/online'),
};

export function getChatWsUrl(): string {
  const token = getStoredAppToken();
  const base = getStoredAuthBase().replace(/^http/, 'ws');
  return `${base}/socket/websocket?token=${token}&vsn=2.0.0`;
}

// --- Types ---
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserProfile extends User {
  bio?: string;
  websiteUrl?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  username: string;
  email: string;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requester: UserProfile;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  caption?: string;
  mediaKey: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export interface Story {
  id: string;
  userId: string;
  mediaKey: string;
  mediaType: 'image' | 'video';
  mediaUrl?: string;
  expiresAt: string;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
}

export interface CommentPage {
  comments: Comment[];
  nextCursor: string | null;
}

export interface Like {
  id: string;
  userId: string;
  createdAt: string;
}

export interface Conversation {
  conversation_id: number;
  type: 'direct' | 'group';
  name?: string;
  other_user_id?: string;
  other_user_name?: string;
  members: ConversationMember[];
  last_message?: {
    body: string;
    user_id: string;
    inserted_at: string;
  };
}

export interface ConversationMember {
  user_id: string;
  username: string;
  role: 'admin' | 'member';
}

export interface Message {
  body: string;
  user_id: string;
  inserted_at: string;
}
