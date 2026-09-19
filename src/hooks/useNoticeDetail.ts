import { useEffect, useState } from 'react';
import { fetchNoticeCardById } from '../lib/noticeQueries';
import type { NoticeCard } from '../types/database';
import type { AsyncStatus } from './asyncStatus';

interface UseNoticeDetailResult {
  noticeCard: NoticeCard | null;
  status: AsyncStatus;
}

/**
 * 입법예고 상세(P3) 데이터 로직. notice_id로 notices+cards를 실제 Supabase에서 조회한다.
 * TODO(explain-impact): 지금은 프로필별 관련성 매칭이 없어서, 카드가 있으면(=make-card가
 * 관련 있다고 판단했으면) 어떤 프로필이든 동일하게 "나에게 중요한 이유"를 보여준다.
 */
export function useNoticeDetail(noticeId: string | undefined): UseNoticeDetailResult {
  const [status, setStatus] = useState<AsyncStatus>(noticeId ? 'loading' : 'error');
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;

    fetchNoticeCardById(noticeId)
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
  }, [noticeId]);

  return { noticeCard, status };
}
