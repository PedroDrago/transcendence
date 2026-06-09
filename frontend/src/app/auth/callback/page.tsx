'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getStoredAuthBase, setStoredAppToken } from '@/lib/auth';

type State = 'loading' | 'success' | 'error';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handoffToken = searchParams.get('token');
    if (!handoffToken) {
      setState('error');
      setErrorMsg('No authentication token received. Please try signing in again.');
      return;
    }

    const authBase = getStoredAuthBase();

    fetch(`${authBase}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: handoffToken }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.access_token) throw new Error(body.message ?? 'Exchange failed.');
        setStoredAppToken(body.access_token);
        setState('success');

        if (body.requires2fa) {
          setTimeout(() => router.replace('/login/2fa'), 800);
        } else {
          setTimeout(() => router.replace('/feed'), 800);
        }
      })
      .catch((err) => {
        setState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      });
  }, [router, searchParams]);

  return (
    <main className="auth-shell auth-shell--callback">
      <section className="auth-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {state === 'loading' && (
          <>
            <span className="spinner" style={{ margin: '0 auto 20px' }} />
            <p style={{ color: 'var(--muted)' }}>Signing you in…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>✓</p>
            <p style={{ color: 'var(--success)' }}>Signed in successfully. Redirecting…</p>
          </>
        )}
        {state === 'error' && (
          <>
            <p style={{ fontSize: '1.3rem', marginBottom: 10, color: 'var(--error)' }}>Sign-in failed</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 20 }}>{errorMsg}</p>
            <a href="/login" className="auth-button" style={{ display: 'inline-block' }}>Back to login</a>
          </>
        )}
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell auth-shell--callback">
          <section className="auth-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <span className="spinner" style={{ margin: '0 auto' }} />
          </section>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
