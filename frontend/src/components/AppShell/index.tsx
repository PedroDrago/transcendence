'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearStoredAuth, decodeJwt, getStoredAppToken } from '@/lib/auth';
import { users as usersApi, UserProfile } from '@/lib/api';

const NAV = [
  { href: '/feed',     label: 'Feed',     icon: '⌂' },
  { href: '/messages', label: 'Messages', icon: '✉' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = getStoredAppToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    usersApi.me().then(setMe).catch(() => {});
  }, [router]);

  const myId = me?.id ?? decodeJwt(getStoredAppToken())?.sub as string | undefined;

  function logout() {
    clearStoredAuth();
    router.push('/login');
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-nav-wordmark">Vellum</span>

        <div className="app-nav-links">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`app-nav-link${pathname.startsWith(href) ? ' app-nav-link--active' : ''}`}
            >
              <span className="app-nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}

          {myId && (
            <Link
              href={`/profile/${myId}`}
              className={`app-nav-link${pathname.startsWith('/profile') ? ' app-nav-link--active' : ''}`}
            >
              <span className="app-nav-icon">◎</span>
              <span>Profile</span>
            </Link>
          )}
        </div>

        <div className="app-nav-bottom">
          {me && (
            <Link href={`/profile/${me.id}`} className="app-nav-profile-link">
              <div className="app-nav-avatar">
                {me.avatarUrl
                  ? <img src={me.avatarUrl} alt={me.username} />
                  : me.username[0].toUpperCase()}
              </div>
              <span className="app-nav-username">{me.username}</span>
            </Link>
          )}
          <button className="app-nav-logout" onClick={logout}>Sign out</button>
        </div>
      </nav>

      <main className="app-main">{children}</main>
    </div>
  );
}
