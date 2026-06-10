'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LanguagePicker from '@/components/LanguangePicker';
import {
  getStoredAuthBase,
  getStoredAppToken,
  setStoredAppToken,
} from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('Register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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
      const response = await fetch(`${authBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? t('errorFallback')),
        );
      }

      if (body.access_token) {
        setStoredAppToken(body.access_token);
        router.push('/feed');
      } else {
        router.push('/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--hero">
        <div>
          <p className="auth-kicker">Vellum</p>
          <h1>{t('createAccount')}</h1>
          <p className="auth-copy">{t('tagline')}</p>
        </div>
        <LanguagePicker />
      </section>

      <section className="auth-card auth-card--form">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>{t('username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              autoComplete="username"
              minLength={3}
              maxLength={20}
              autoFocus
              aria-required="true"
            />
          </label>
          <label className="auth-field">
            <span>{t('email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-required="true"
            />
          </label>
          <label className="auth-field">
            <span>{t('password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              autoComplete="new-password"
              minLength={8}
              aria-required="true"
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? t('submitting') : t('submit')}
          </button>
        </form>

        <p className="auth-switch">
          {t('alreadyHaveAccount')} <Link href="/login">{t('signIn')}</Link>
        </p>
      </section>
    </main>
  );
}
