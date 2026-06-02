'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  DEFAULT_AUTH_BASE,
  getStoredAuthBase,
  setStoredAppToken,
  setStoredHandoffToken,
} from '@/lib/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Waiting for OAuth callback token...');
  const [details, setDetails] = useState('No token processed yet.');

  useEffect(() => {
    const handoffToken = searchParams.get('token');
    if (!handoffToken) {
      setStatus('Missing OAuth handoff token');
      setDetails('The callback did not include a `token` query parameter.');
      return;
    }

    const authBase = getStoredAuthBase() ?? DEFAULT_AUTH_BASE;
    setStoredHandoffToken(handoffToken);
    setStatus('Exchanging OAuth handoff token...');
    setDetails('Calling POST /auth/oauth/exchange through the API gateway with the token received from the OAuth callback.');

    void fetch(`${authBase}/auth/oauth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: handoffToken }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.access_token) {
          throw new Error(JSON.stringify(body, null, 2));
        }
        setStoredAppToken(body.access_token);
        setStatus('OAuth exchange succeeded');
        setDetails(JSON.stringify(body, null, 2));
        setTimeout(() => router.replace('/account'), 600);
      })
      .catch((error) => {
        setStatus('OAuth exchange failed');
        setDetails(error instanceof Error ? error.message : 'Unknown exchange error');
      });
  }, [router, searchParams]);

  return (
    <main className="auth-shell auth-shell--callback">
      <section className="auth-card">
        <div className="auth-section-head">
          <h1>OAuth Callback</h1>
          <p>This page exchanges the handoff token, stores the app JWT, and forwards you into the authenticated area.</p>
        </div>
        <div className="auth-status-chip">{status}</div>
        <pre className="auth-mono auth-claims">{details}</pre>
        <div className="auth-inline-link">
          <Link href="/account">Go to account</Link>
        </div>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="auth-shell auth-shell--callback"><section className="auth-card"><p>Loading callback...</p></section></main>}>
      <CallbackContent />
    </Suspense>
  );
}
