import { useEffect, useState } from 'react';
import {
  getNoticeCardById,
  getNotificationsForProfile,
  markNotificationRead,
} from '../lib/demoStore';
import type { AppNotification, NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';
import { simulateFetch } from './asyncStatus';

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

/** 알림함(P7) 데이터 로직: 현재 프로필의 알림 목록과 읽음 처리를 담당한다. */
export function useNotifications(): UseNotificationsResult {
  const { currentProfileId, notifications } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [entries, setEntries] = useState<NotificationEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    simulateFetch(() =>
      getNotificationsForProfile(currentProfileId).map((notification) => ({
        notification,
        noticeCard: notification.related_notice_id
          ? getNoticeCardById(notification.related_notice_id)
          : undefined,
      })),
    )
      .then((result) => {
        if (cancelled) return;
        setEntries(result);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, notifications]);

  return {
    entries,
    unreadCount: entries.filter((e) => !e.notification.is_read).length,
    status,
    markRead: markNotificationRead,
  };
}
