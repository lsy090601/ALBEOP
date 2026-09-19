import { useEffect, useState } from 'react';
import { fetchNoticeCardById } from '../lib/noticeQueries';
import type { NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

interface UseNoticeDetailResult {
  noticeCard: NoticeCard | null;
  status: AsyncStatus;
}

/**
 * 입법예고 상세(P3) 데이터 로직. notice_id로 notices+cards+card_impacts를 실제 Supabase에서 조회한다.
 * "나에게 중요한 이유" 섹션은 explain-impact가 현재 프로필용으로 만든 impact_text/calculation_basis를 쓴다.
 */
export function useNoticeDetail(noticeId: string | undefined): UseNoticeDetailResult {
  const { currentProfileId } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>(noticeId ? 'loading' : 'error');
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;

    fetchNoticeCardById(noticeId, currentProfileId)
      .then((result) => {
        if (cancelled) return;
        setNoticeCard(result);
        setStatus(result ? 'success' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [noticeId, currentProfileId]);

  return { noticeCard, status };
}
