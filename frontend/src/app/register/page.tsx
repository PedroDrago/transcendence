'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguagePicker from '@/components/LanguangePicker';
import {
  DEFAULT_AUTH_BASE,
  getStoredAuthBase,
  setStoredAuthBase,
} from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [authBase, setAuthBase] = useState(DEFAULT_AUTH_BASE);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthBase(getStoredAuthBase());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setStoredAuthBase(authBase);

    try {
      const response = await fetch(`${authBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message ?? 'Unable to register.');
      }

      setMessage('Registration succeeded. You can sign in now.');
      setTimeout(() => router.push('/login'), 700);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown registration error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--hero">
        <div>
          <p className="auth-kicker">Transcendence</p>
          <h1>Create account</h1>
          <p className="auth-copy">
            Basic registration against the auth service. This page is intentionally
            simple so you can verify the backend flow quickly.
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
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message ? <p className="auth-success">{message}</p> : null}
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
