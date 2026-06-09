'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguagePicker from '@/components/LanguangePicker';
import {
  getStoredAuthBase,
  getStoredAppToken,
  setStoredAppToken,
} from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredAppToken()) router.replace('/feed');
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authBase = getStoredAuthBase();
      const response = await fetch(`${authBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const body = await response.json();
      if (!response.ok || !body.access_token) {
        throw new Error(body.message ?? 'Unable to log in.');
      }

      setStoredAppToken(body.access_token);

      if (body.requires2fa) {
        router.push('/login/2fa');
      } else {
        router.push('/feed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--hero">
        <div>
          <p className="auth-kicker">Vellum</p>
          <h1>Welcome back</h1>
          <p className="auth-copy">
            Sign in to connect with friends, share moments, and see what&apos;s happening.
          </p>
        </div>
        <LanguagePicker />
      </section>

      <section className="auth-card auth-card--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username or email</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="yourname or you@example.com"
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-actions">
          <button
            type="button"
            className="auth-button auth-button--secondary"
            onClick={() => {
              window.location.href = `${getStoredAuthBase()}/auth/google`;
            }}
          >
            Continue with Google
          </button>
          <p className="auth-switch">
            Need an account? <Link href="/register">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
