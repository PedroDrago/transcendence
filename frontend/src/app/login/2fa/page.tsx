'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredAuthBase, getStoredAppToken, setStoredAppToken } from '@/lib/auth';

export default function TwoFactorLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authBase = getStoredAuthBase();
      const tempToken = getStoredAppToken(); // Contains typ: '2fa'

      const response = await fetch(`${authBase}/auth/2fa/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code }),
      });

      const body = await response.json();
      if (!response.ok || !body.access_token) {
        throw new Error(body.message ?? 'Invalid code.');
      }

      setStoredAppToken(body.access_token);
      router.push('/feed');
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
          <p className="auth-kicker">Security</p>
          <h1>Two-Factor Authentication</h1>
          <p className="auth-copy">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
      </section>

      <section className="auth-card auth-card--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Authenticator Code</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </section>
    </main>
  );
}
