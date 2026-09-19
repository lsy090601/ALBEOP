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
 * 홈(P2) 데이터 로직. cards/notices를 실제 Supabase에서 조회한다.
 * (참고) 프로필별 카드 매칭은 아직 없어서 currentProfileId는 직접 필터링에 쓰이지 않고,
 * 인사말/빈 문구에 이름을 표시하는 용도로만 다른 곳(HomePage)에서 쓰인다.
 */
export function useHomeData(): UseHomeDataResult {
  const { agentLogs } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [data, setData] = useState<HomeData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const relatedCards = await fetchRelatedNoticeCards();
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
    // agentLogs가 바뀌면(에이전트 실행) 홈의 "최근 실행" 요약도 다시 계산한다.
  }, [agentLogs, reloadKey]);

  return {
    status,
    ...data,
    reload: () => {
      setStatus('loading');
      setReloadKey((k) => k + 1);
    },
  };
}
