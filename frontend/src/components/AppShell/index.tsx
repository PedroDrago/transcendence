'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearStoredAuth, decodeJwt, getStoredAppToken } from '@/lib/auth';
import { users as usersApi, UserProfile } from '@/lib/api';
import Avatar from '@/components/Avatar';

// ─── SVG icons ────────────────────────────────────────────

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Nav item definition ──────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

// ─── AppShell ─────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    const token = getStoredAppToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    usersApi.me().then(setMe).catch(() => {});
    usersApi.friendRequests()
      .then((reqs) => setPendingRequests(reqs.filter((r) => r.status === 'PENDING').length))
      .catch(() => {});
  }, [router]);

  const myId = me?.id ?? (decodeJwt(getStoredAppToken())?.sub as string | undefined);

  const NAV: NavItem[] = [
    { href: '/feed',          label: 'Feed',          icon: <IconHome /> },
    { href: '/messages',      label: 'Messages',      icon: <IconMessage /> },
    { href: '/notifications', label: 'Notifications', icon: <IconBell />, badge: pendingRequests || undefined },
    ...(myId ? [{ href: `/profile/${myId}`, label: 'Profile', icon: <IconUser /> }] : []),
    { href: '/settings',      label: 'Settings',      icon: <IconSettings /> },
  ];

  function logout() {
    clearStoredAuth();
    router.push('/login');
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-nav-wordmark">Vellum</span>

        <div className="app-nav-links">
          {NAV.map(({ href, label, icon, badge }) => {
            const active = href.startsWith('/profile')
              ? pathname.startsWith('/profile')
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`app-nav-link${active ? ' app-nav-link--active' : ''}`}
              >
                <span className="app-nav-icon">
                  {icon}
                  {badge ? <span className="badge">{badge > 9 ? '9+' : badge}</span> : null}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="app-nav-bottom">
          {me && (
            <Link href={`/profile/${me.id}`} className="app-nav-profile-link">
              <Avatar username={me.username} avatarUrl={me.avatarUrl} size={28} className="app-nav-avatar" />
              <span className="app-nav-username">{me.username}</span>
            </Link>
          )}
          <button className="app-nav-logout" onClick={logout}>
            <IconLogout />
            <span>Sign out</span>
          </button>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <Link href="/privacy" style={{ textDecoration: 'none', color: 'inherit' }}>Privacy</Link>
            <span>&middot;</span>
            <Link href="/terms" style={{ textDecoration: 'none', color: 'inherit' }}>Terms</Link>
          </div>
        </div>
      </nav>

      <main className="app-main">{children}</main>
    </div>
  );
}
