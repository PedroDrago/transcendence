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
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('Auth');
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
          <h1>{t('welcomeBack')}</h1>
          <p className="auth-copy">
            {t('signInCopy')}
          </p>
        </div>
        <LanguagePicker />
      </section>

      <section className="auth-card auth-card--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('identifier')}</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="yourname or you@example.com"
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="auth-field">
            <span>{t('password')}</span>
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
            {loading ? t('signingIn') : t('signIn')}
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
            {t('continueWithGoogle')}
          </button>
          <p className="auth-switch">
            {t('needAccount')} <Link href="/register">{t('createOne')}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
