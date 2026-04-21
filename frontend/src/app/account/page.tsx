'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguagePicker from '@/components/LanguangePicker';
import {
  clearStoredAuth,
  decodeJwt,
  DEFAULT_AUTH_BASE,
  getStoredAppToken,
  getStoredAuthBase,
  setStoredAppToken,
  setStoredAuthBase,
} from '@/lib/auth';

type ApiFeedback = {
  title: string;
  body: string;
  tone: 'idle' | 'success' | 'error';
};

export default function AccountPage() {
  const router = useRouter();
  const [authBase, setAuthBase] = useState(DEFAULT_AUTH_BASE);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<ApiFeedback>({
    title: 'Account',
    body: 'Authenticated actions will show their latest response here.',
    tone: 'idle',
  });

  useEffect(() => {
    const storedToken = getStoredAppToken();
    if (!storedToken) {
      router.replace('/login');
      return;
    }
    setAuthBase(getStoredAuthBase());
    setToken(storedToken);
  }, [router]);

  const claims = useMemo(() => decodeJwt(token), [token]);

  async function callAuthenticatedEndpoint(
    title: string,
    path: string,
    body: Record<string, string>,
  ) {
    setStoredAuthBase(authBase);
    try {
      const response = await fetch(`${authBase}${path}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(payload, null, 2));
      }

      if (payload.access_token) {
        setStoredAppToken(payload.access_token);
        setToken(payload.access_token);
      }

      setFeedback({
        title,
        body: JSON.stringify(payload, null, 2),
        tone: 'success',
      });
    } catch (caughtError) {
      setFeedback({
        title,
        body: caughtError instanceof Error ? caughtError.message : 'Unknown request error.',
        tone: 'error',
      });
    }
  }

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await callAuthenticatedEndpoint('Username Updated', '/auth/username', { username });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await callAuthenticatedEndpoint('Password Updated', '/auth/password', {
      currentPassword,
      newPassword,
    });
  }

  function logout() {
    clearStoredAuth();
    router.push('/login');
  }

  return (
    <main className="auth-shell auth-shell--account">
      <section className="auth-card auth-card--hero">
        <div>
          <p className="auth-kicker">Account</p>
          <h1>Authenticated actions</h1>
          <p className="auth-copy">
            This page is where you can exercise the protected auth endpoints and inspect
            the current JWT side by side with its decoded claims.
          </p>
        </div>
        <div className="auth-hero-actions">
          <LanguagePicker />
          <button type="button" className="auth-button auth-button--ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </section>

      <section className="auth-grid">
        <section className="auth-card">
          <div className="auth-section-head">
            <h2>Connection</h2>
            <p>Change the auth base URL if you need to hit another instance.</p>
          </div>
          <label className="auth-field">
            <span>Auth service URL</span>
            <input
              value={authBase}
              onChange={(event) => {
                const value = event.target.value;
                setAuthBase(value);
                setStoredAuthBase(value);
              }}
            />
          </label>
          <p className="auth-inline-link">
            Need a different session? <Link href="/login">Back to login</Link>
          </p>
        </section>

        <form className="auth-card" onSubmit={handleUsernameSubmit}>
          <div className="auth-section-head">
            <h2>Finalize username</h2>
            <p>Calls `PATCH /auth/username` and updates the stored JWT if a new token is returned.</p>
          </div>
          <label className="auth-field">
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <button type="submit">Save username</button>
        </form>

        <form className="auth-card" onSubmit={handlePasswordSubmit}>
          <div className="auth-section-head">
            <h2>Change password</h2>
            <p>Calls `PATCH /auth/password` with the current token.</p>
          </div>
          <label className="auth-field">
            <span>Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <button type="submit">Update password</button>
        </form>

        <section className={`auth-card auth-card--feedback auth-card--${feedback.tone}`}>
          <div className="auth-section-head">
            <h2>{feedback.title}</h2>
            <p>Latest authenticated endpoint response.</p>
          </div>
          <pre>{feedback.body}</pre>
        </section>
      </section>

      <section className="auth-grid auth-grid--wide">
        <section className="auth-card">
          <div className="auth-section-head">
            <h2>JWT</h2>
            <p>The raw token currently stored in the browser.</p>
          </div>
          <textarea
            className="auth-mono auth-textarea"
            rows={14}
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setStoredAppToken(event.target.value);
            }}
          />
        </section>
        <section className="auth-card">
          <div className="auth-section-head">
            <h2>Claims</h2>
            <p>Decoded JWT payload for quick verification of UUID, username, email, and onboarding flags.</p>
          </div>
          <pre className="auth-mono auth-claims">
            {claims ? JSON.stringify(claims, null, 2) : 'No valid JWT loaded.'}
          </pre>
        </section>
      </section>
    </main>
  );
}
