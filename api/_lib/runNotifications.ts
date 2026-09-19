import { supabaseAdmin } from './supabaseAdmin.ts';
import type { AppNotification, Card, Notice } from './trackingTypes.ts';

export interface NotificationEntry {
  notification: AppNotification;
  noticeCard: { notice: Notice; card: Card } | null;
}

/** 알림함(P7) 목록을 real Supabase에서 조회한다. notifications도 opinions와 같은 RLS 제약이 있다. */
export async function runFetchNotifications(profileId: string): Promise<NotificationEntry[]> {
  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`notifications 조회 실패: ${error.message}`);

  const all = (notifications ?? []) as AppNotification[];
  if (all.length === 0) return [];

  const noticeIds = [...new Set(all.map((n) => n.related_notice_id).filter((id): id is string => !!id))];
  let noticeMap = new Map<string, Notice>();
  let cardMap = new Map<string, Card>();

  if (noticeIds.length > 0) {
    const { data: notices, error: noticesError } = await supabaseAdmin
      .from('notices')
      .select('*')
      .in('id', noticeIds);
    if (noticesError) throw new Error(`notices 조회 실패: ${noticesError.message}`);
    noticeMap = new Map(((notices ?? []) as Notice[]).map((n) => [n.id, n]));

    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('cards')
      .select('*')
      .in('notice_id', noticeIds);
    if (cardsError) throw new Error(`cards 조회 실패: ${cardsError.message}`);
    cardMap = new Map(((cards ?? []) as Card[]).map((c) => [c.notice_id, c]));
  }

  return all.map((notification) => {
    const notice = notification.related_notice_id ? noticeMap.get(notification.related_notice_id) : undefined;
    const card = notice ? cardMap.get(notice.id) : undefined;
    return {
      notification,
      noticeCard: notice && card ? { notice, card } : null,
    };
  });
}

/** 알림 하나를 읽음 처리한다. */
export async function runMarkNotificationRead(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw new Error(`notifications 업데이트 실패: ${error.message}`);
}
