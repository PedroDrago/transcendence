'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { users as usersApi, FriendRequest } from '@/lib/api';

function FriendRequestItem({
  request,
  onRespond,
}: {
  request: FriendRequest;
  onRespond: (id: string, status: 'ACCEPTED' | 'REJECTED') => void;
}) {
  return (
    <div className="notif-item">
      <div className="notif-item-avatar">
        {request.requester.username[0].toUpperCase()}
      </div>
      <div className="notif-item-body">
        <span className="notif-item-name">{request.requester.username}</span>
        <span className="notif-item-text">sent you a friend request</span>
      </div>
      <div className="notif-item-actions">
        <button className="app-btn app-btn--sm" onClick={() => onRespond(request.id, 'ACCEPTED')}>
          Accept
        </button>
        <button
          className="app-btn app-btn--ghost app-btn--sm"
          onClick={() => onRespond(request.id, 'REJECTED')}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
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
          <span className="feed-title">Notifications</span>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="spinner" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <p className="notif-empty">No new notifications.</p>
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
