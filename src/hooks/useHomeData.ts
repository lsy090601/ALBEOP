import { useEffect, useState } from 'react';
import { getAgentLogs } from '../lib/demoStore';
import { getOtherNoticeCards, getRelatedNoticeCards } from '../lib/mockData';
import type { NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';
import { simulateFetch } from './asyncStatus';

interface HomeData {
  relatedCards: NoticeCard[];
  otherCards: NoticeCard[];
  latestRunLabel: string | null;
}

interface UseHomeDataResult extends Partial<HomeData> {
  status: AsyncStatus;
  reload: () => void;
}

/**
 * 홈(P2) 데이터 로직. Supabase 연동 시 이 훅 내부의 조회 부분만
 * 실제 쿼리로 교체하면 되고, HomePage는 손대지 않아도 된다.
 */
export function useHomeData(): UseHomeDataResult {
  const { currentProfileId, agentLogs } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [data, setData] = useState<HomeData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    simulateFetch(() => {
      const latest = getAgentLogs()[0];
      return {
        relatedCards: getRelatedNoticeCards(currentProfileId),
        otherCards: getOtherNoticeCards(currentProfileId),
        latestRunLabel: latest ? new Date(latest.run_at).toISOString().slice(11, 16) : null,
      };
    })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // agentLogs가 바뀌면(에이전트 실행) 홈의 "최근 실행" 요약도 다시 계산한다.
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
