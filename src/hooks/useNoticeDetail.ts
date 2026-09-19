import { useEffect, useState } from 'react';
import { getNoticeCardById } from '../lib/demoStore';
import { getRelatedNoticeCards } from '../lib/mockData';
import type { NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';
import { simulateFetch } from './asyncStatus';

interface UseNoticeDetailResult {
  noticeCard: NoticeCard | null;
  isRelevantToCurrentProfile: boolean;
  status: AsyncStatus;
}

/** 입법예고 상세(P3) 데이터 로직. notice_id로 notices+cards 조인 결과를 조회한다. */
export function useNoticeDetail(noticeId: string | undefined): UseNoticeDetailResult {
  const { currentProfileId } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>(noticeId ? 'loading' : 'error');
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);
  const [isRelevant, setIsRelevant] = useState(false);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;

    simulateFetch(() => ({
      result: getNoticeCardById(noticeId) ?? null,
      related: getRelatedNoticeCards(currentProfileId).some((nc) => nc.notice.id === noticeId),
    })).then(({ result, related }) => {
      if (cancelled) return;
      setNoticeCard(result);
      setIsRelevant(related);
      setStatus(result ? 'success' : 'error');
    });

    return () => {
      cancelled = true;
    };
  }, [noticeId, currentProfileId]);

  return { noticeCard, isRelevantToCurrentProfile: isRelevant, status };
}
