'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import FriendRequestItem from '@/components/FriendRequestItem';
import { users as usersApi, FriendRequest } from '@/lib/api';
import { useTranslations } from 'next-intl';

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi
      .friendRequests()
      .then((reqs) => setRequests(reqs.filter((r) => r.status === 'PENDING')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function respond(id: string, status: 'ACCEPTED' | 'REJECTED') {
    try {
      await usersApi.respondFriendRequest(id, status);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  return (
    <AppShell>
      <div className="notif-wrap">
        <div className="feed-topbar">
          <span className="feed-title">{t('title')}</span>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="spinner" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <p className="notif-empty">{t('empty')}</p>
        )}

        {!loading && requests.length > 0 && (
          <div className="notif-section">
            <p className="notif-section-label">Friend requests</p>
            {requests.map((r) => (
              <FriendRequestItem key={r.id} request={r} onRespond={respond} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
