import { useEffect, useState } from 'react';
import { fetchNoticeDetail } from '../lib/noticeQueries';
import type { NoticeDetail } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

interface UseNoticeDetailResult {
  noticeCard: NoticeDetail | null;
  status: AsyncStatus;
}

/**
 * 입법예고 상세(P3) 데이터 로직. notice_id로 notices(+cards+card_impacts, 있으면)를 조회한다.
 * cards가 아직 없는 법안(대다수)은 card: null로 돌아오고, 페이지는 "기본 정보 모드"로 표시한다.
 * "나에게 중요한 이유" 섹션은 explain-impact가 현재 프로필용으로 만든 impact_text/calculation_basis를 쓴다.
 */
export function useNoticeDetail(noticeId: string | undefined): UseNoticeDetailResult {
  const { currentProfileId } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>(noticeId ? 'loading' : 'error');
  const [noticeCard, setNoticeCard] = useState<NoticeDetail | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;

    fetchNoticeDetail(noticeId, currentProfileId)
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
