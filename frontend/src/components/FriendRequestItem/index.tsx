'use client';

import Avatar from '@/components/Avatar';
import type { FriendRequest } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface Props {
  request: FriendRequest;
  onRespond: (id: string, status: 'ACCEPTED' | 'REJECTED') => void;
}

export default function FriendRequestItem({ request, onRespond }: Props) {
  const t = useTranslations('Notifications');

  return (
    <div className="notif-item">
      <Avatar
        username={request.requester.username}
        avatarUrl={request.requester.avatarUrl}
        size={40}
        className="notif-item-avatar"
      />
      <div className="notif-item-body">
        <span className="notif-item-name">{request.requester.username}</span>
        <span className="notif-item-text">{t('friendRequest')}</span>
      </div>
      <div className="notif-item-actions">
        <button
          className="app-btn app-btn--sm"
          onClick={() => onRespond(request.id, 'ACCEPTED')}
        >
          {t('accept')}
        </button>
        <button
          className="app-btn app-btn--ghost app-btn--sm"
          onClick={() => onRespond(request.id, 'REJECTED')}
        >
          {t('reject')}
        </button>
      </div>
    </div>
  );
}
