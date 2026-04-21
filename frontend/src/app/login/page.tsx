'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguagePicker from '@/components/LanguangePicker';
import {
  DEFAULT_AUTH_BASE,
  getStoredAuthBase,
  getStoredAppToken,
  setStoredAppToken,
  setStoredAuthBase,
} from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [authBase, setAuthBase] = useState(DEFAULT_AUTH_BASE);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthBase(getStoredAuthBase());
    if (getStoredAppToken()) {
      router.replace('/account');
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setStoredAuthBase(authBase);

    try {
      const response = await fetch(`${authBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const body = await response.json();
      if (!response.ok || !body.access_token) {
        throw new Error(body.message ?? 'Unable to log in.');
      }

      setStoredAppToken(body.access_token);
      router.push('/account');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown login error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--hero">
        <div>
          <p className="auth-kicker">Transcendence</p>
          <h1>Sign in</h1>
          <p className="auth-copy">
            Use your username or email, or continue with Google. This is a simple
            real auth page for manual backend testing, not final product UI.
          </p>
        </div>
        <LanguagePicker />
      </section>

      <section className="auth-card auth-card--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Auth service URL</span>
            <input value={authBase} onChange={(event) => setAuthBase(event.target.value)} />
          </label>
          <label className="auth-field">
            <span>Username or email</span>
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-actions">
          <button
            type="button"
            className="auth-button auth-button--secondary"
            onClick={() => {
              setStoredAuthBase(authBase);
              window.location.href = `${authBase}/auth/google`;
            }}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="auth-button auth-button--ghost"
            onClick={() => {
              setStoredAuthBase(authBase);
              window.location.href = `${authBase}/auth/google/test`;
            }}
          >
            Google test flow
          </button>
          <p className="auth-switch">
            Need an account? <Link href="/register">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
