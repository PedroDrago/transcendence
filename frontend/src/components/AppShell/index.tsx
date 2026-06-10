'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearStoredAuth, getStoredAppToken } from '@/lib/auth';
import { useMyId } from '@/lib/hooks';
import { users as usersApi, UserProfile } from '@/lib/api';
import Avatar from '@/components/Avatar';
import LanguagePicker from '@/components/LanguangePicker';
import { IconHome, IconMessage, IconUser, IconSettings, IconBell, IconLogout } from '@/components/Icons';
import { useTranslations } from 'next-intl';

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

  const tokenId = useMyId();
  const myId = me?.id ?? tokenId;

  const t = useTranslations('AppShell');

  const NAV: NavItem[] = [
    { href: '/feed',          label: t('nav.feed'),          icon: <IconHome /> },
    { href: '/messages',      label: t('nav.messages'),      icon: <IconMessage /> },
    { href: '/notifications', label: t('nav.notifications'), icon: <IconBell />, badge: pendingRequests || undefined },
    ...(myId ? [{ href: `/profile/${myId}`, label: t('nav.profile'), icon: <IconUser /> }] : []),
    { href: '/settings',      label: t('nav.settings'),      icon: <IconSettings /> },
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
            <span>{t('signOut')}</span>
          </button>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            <LanguagePicker />
          </div>

          <div style={{ fontSize: '11px', color: '#888', marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <Link href="/privacy" style={{ textDecoration: 'none', color: 'inherit' }}>{t('privacy')}</Link>
            <span>&middot;</span>
            <Link href="/terms" style={{ textDecoration: 'none', color: 'inherit' }}>{t('terms')}</Link>
          </div>
        </div>
      </nav>

      <main className="app-main">{children}</main>
    </div>
  );
}
