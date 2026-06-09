'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import { users as usersApi, auth as authApi, UserProfile } from '@/lib/api';
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
      <Avatar username={profile.username} avatarUrl={preview} size={72} className="settings-avatar-preview" />
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

// ─── Two-Factor Authentication ──────────────────────────────
function TwoFactorSection() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    authApi.get2faStatus().then((res) => setIsEnabled(res.isTwoFactorEnabled)).catch(() => {});
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await authApi.generate2fa();
      setQrCodeDataUrl(res.qrCodeDataUrl);
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await authApi.turnOn2fa(code);
      setIsEnabled(true);
      setQrCodeDataUrl(null);
      setCode('');
      setMsg({ text: '2FA Enabled.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await authApi.turnOff2fa(code);
      setIsEnabled(false);
      setCode('');
      setMsg({ text: '2FA Disabled.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed.', ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Two-Factor Authentication" description="Add an extra layer of security to your account.">
      {!isEnabled && !qrCodeDataUrl && (
        <>
          <p className="settings-msg">Two-Factor Authentication is currently disabled.</p>
          <button type="button" className="app-btn app-btn--sm" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Set up 2FA'}
          </button>
          <StatusMsg msg={msg} />
        </>
      )}

      {!isEnabled && qrCodeDataUrl && (
        <form onSubmit={handleEnable}>
          <p className="settings-msg">Scan this QR code with your authenticator app (e.g. Google Authenticator), then enter the code below.</p>
          <img src={qrCodeDataUrl} alt="2FA QR Code" style={{ marginBottom: '1rem', borderRadius: '8px' }} />
          <div className="settings-field">
            <span>Authentication Code</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="app-btn app-btn--sm" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Enable 2FA'}
            </button>
            <button type="button" className="app-btn app-btn--ghost app-btn--sm" onClick={() => { setQrCodeDataUrl(null); setCode(''); }}>
              Cancel
            </button>
          </div>
          <StatusMsg msg={msg} />
        </form>
      )}

      {isEnabled && (
        <form onSubmit={handleDisable}>
          <p className="settings-msg settings-msg--success">Two-Factor Authentication is enabled.</p>
          <div className="settings-field">
            <span>Enter code to disable</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
          </div>
          <button type="submit" className="app-btn app-btn--secondary app-btn--sm" disabled={loading || code.length !== 6}>
            {loading ? 'Disabling…' : 'Disable 2FA'}
          </button>
          <StatusMsg msg={msg} />
        </form>
      )}
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
        <TwoFactorSection />
      </div>
    </AppShell>
  );
}
