import { useEffect, useState } from 'react';
import { getAgentLogs } from '../lib/demoStore';
import { fetchOtherNotices, fetchRelatedNoticeCards } from '../lib/noticeQueries';
import type { Notice, NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

interface HomeData {
  relatedCards: NoticeCard[];
  otherNotices: Notice[];
  otherNoticesTotalCount: number;
  latestRunLabel: string | null;
}

interface UseHomeDataResult extends Partial<HomeData> {
  status: AsyncStatus;
  reload: () => void;
}

/**
 * 홈(P2) 데이터 로직. cards/notices/card_impacts를 실제 Supabase에서 조회한다.
 * relatedCards는 explain-impact가 현재 프로필에게 "해당"으로 확정한 카드만 담는다.
 */
export function useHomeData(): UseHomeDataResult {
  const { currentProfileId, agentLogs } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [data, setData] = useState<HomeData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const relatedCards = await fetchRelatedNoticeCards(currentProfileId);
        const { notices: otherNotices, totalCount: otherNoticesTotalCount } =
          await fetchOtherNotices(relatedCards.map((nc) => nc.notice.id));
        const latest = getAgentLogs()[0];

        if (cancelled) return;
        setData({
          relatedCards,
          otherNotices,
          otherNoticesTotalCount,
          latestRunLabel: latest ? new Date(latest.run_at).toISOString().slice(11, 16) : null,
        });
        setStatus('success');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // agentLogs가 바뀌면(에이전트 실행) 홈의 "최근 실행" 요약도 다시 계산하고,
    // currentProfileId가 바뀌면(프로필 전환) 관련 카드도 다시 조회한다.
  }, [currentProfileId, agentLogs, reloadKey]);

  return {
    status,
    ...data,
    reload: () => {
      setStatus('loading');
      setReloadKey((k) => k + 1);
    },
  };
}
