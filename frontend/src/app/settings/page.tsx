'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import { users as usersApi, auth as authApi, UserProfile, FriendRequest } from '@/lib/api';
import { setStoredAppToken } from '@/lib/auth';

type Msg = { text: string; ok: boolean } | null;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function StatusMsg({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={`settings-msg settings-msg--${msg.ok ? 'success' : 'error'}`}>{msg.text}</p>
  );
}

// ─── Avatar section ───────────────────────────────────────

function AvatarSection({ profile, onUpdate }: { profile: UserProfile; onUpdate: (p: UserProfile) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(profile.avatarUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState<Msg>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setMsg(null);
    try {
      const updated = await usersApi.updateAvatar(file);
      onUpdate(updated);
      setMsg({ text: 'Avatar updated.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Avatar" description="Upload a photo. Supported: jpg, png, webp (max 5 MB).">
      {preview
        ? <img className="settings-avatar-preview" src={preview} alt="avatar" />
        : (
          <div className="settings-avatar-placeholder">
            {profile.username[0].toUpperCase()}
          </div>
        )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        className="app-btn app-btn--ghost app-btn--sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? 'Uploading…' : 'Change avatar'}
      </button>
      <StatusMsg msg={msg} />
    </Section>
  );
}

// ─── Profile section ──────────────────────────────────────

function ProfileSection({ profile, onUpdate }: { profile: UserProfile; onUpdate: (p: UserProfile) => void }) {
  const [bio,        setBio]     = useState(profile.bio ?? '');
  const [website,    setWebsite] = useState(profile.websiteUrl ?? '');
  const [loading,    setLoading] = useState(false);
  const [msg,        setMsg]     = useState<Msg>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const updated = await usersApi.updateMe({ bio: bio || undefined, websiteUrl: website || undefined });
      onUpdate(updated);
      setMsg({ text: 'Profile updated.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Profile" description="Update your bio and website URL.">
      <form onSubmit={save}>
        <div className="settings-field">
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
        </div>
        <div className="settings-field">
          <span>Website URL</span>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <button type="submit" className="app-btn app-btn--sm" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        <StatusMsg msg={msg} />
      </form>
    </Section>
  );
}

// ─── Username section ─────────────────────────────────────

function UsernameSection({ current }: { current: string }) {
  const [username, setUsername] = useState(current);
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState<Msg>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (username === current) return;
    setLoading(true);
    setMsg(null);
    try {
      await authApi.changeUsername(username);
      setMsg({ text: 'Username updated.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Username" description="Change your public handle.">
      <form onSubmit={save}>
        <div className="settings-field">
          <span>New username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={20} />
        </div>
        <button type="submit" className="app-btn app-btn--sm" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        <StatusMsg msg={msg} />
      </form>
    </Section>
  );
}

// ─── Password section ─────────────────────────────────────

function PasswordSection() {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState<Msg>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await authApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setMsg({ text: 'Password updated.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Password" description="Choose a strong password with at least 8 characters.">
      <form onSubmit={save}>
        <div className="settings-field">
          <span>Current password</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="settings-field">
          <span>New password</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} />
        </div>
        <button type="submit" className="app-btn app-btn--sm" disabled={loading}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
        <StatusMsg msg={msg} />
      </form>
    </Section>
  );
}

// ─── Friend requests section ──────────────────────────────

function FriendRequestsSection() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    usersApi.friendRequests()
      .then((reqs) => setRequests(reqs.filter((r) => r.status === 'PENDING')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function respond(id: string, status: 'ACCEPTED' | 'REJECTED') {
    try {
      await usersApi.respondFriendRequest(id, status);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  return (
    <Section
      title={`Friend requests${requests.length ? ` (${requests.length})` : ''}`}
      description="Pending requests from other users."
    >
      {loading && <span className="spinner" />}
      {!loading && requests.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No pending requests.</p>
      )}
      {requests.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ flex: 1, fontSize: '0.9rem' }}>{r.requester.username}</span>
          <button className="app-btn app-btn--sm" onClick={() => respond(r.id, 'ACCEPTED')}>
            Accept
          </button>
          <button className="app-btn app-btn--ghost app-btn--sm" onClick={() => respond(r.id, 'REJECTED')}>
            Decline
          </button>
        </div>
      ))}
    </Section>
  );
}

// ─── Settings page ────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    usersApi.me().then(setProfile).catch(() => {});
  }, []);

  if (!profile) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="settings-wrap">
        <div className="settings-header">
          <p className="settings-kicker">Vellum</p>
          <h1>Settings</h1>
        </div>

        <AvatarSection   profile={profile} onUpdate={setProfile} />
        <ProfileSection  profile={profile} onUpdate={setProfile} />
        <UsernameSection current={profile.username} />
        <PasswordSection />
        <FriendRequestsSection />
      </div>
    </AppShell>
  );
}
