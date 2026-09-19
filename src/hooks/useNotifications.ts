import { useEffect, useState } from 'react';
import { markNotificationRead } from '../lib/demoStore';
import type { AppNotification, NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

export interface NotificationEntry {
  notification: AppNotification;
  noticeCard: NoticeCard | undefined;
}

interface UseNotificationsResult {
  entries: NotificationEntry[];
  unreadCount: number;
  status: AsyncStatus;
  markRead: (id: string) => void;
}

interface NotificationsResponse {
  ok: boolean;
  entries: { notification: AppNotification; noticeCard: NoticeCard | null }[];
  error?: string;
}

/**
 * 알림함(P7) 데이터 로직: 실제 notifications를 조회한다.
 * (notifications도 RLS 때문에 브라우저에서 직접 못 읽어 /api/notifications가 대신 읽어준다)
 */
export function useNotifications(): UseNotificationsResult {
  const { currentProfileId, voiceVersion } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [entries, setEntries] = useState<NotificationEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!currentProfileId) {
      // effect 본문에서 동기적으로 setState하지 않도록 setTimeout으로 감싼다.
      const timer = setTimeout(() => {
        if (cancelled) return;
        setEntries([]);
        setStatus('success');
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    fetch(`/api/notifications?profile_id=${encodeURIComponent(currentProfileId)}`)
      .then((res) => res.json() as Promise<NotificationsResponse>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error);
        setEntries(
          json.entries.map(({ notification, noticeCard }) => ({
            notification,
            noticeCard: noticeCard ?? undefined,
          })),
        );
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, voiceVersion]);

  return {
    entries,
    unreadCount: entries.filter((e) => !e.notification.is_read).length,
    status,
    markRead: markNotificationRead,
  };
}
