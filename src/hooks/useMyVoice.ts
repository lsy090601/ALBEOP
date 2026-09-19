import { useEffect, useState } from 'react';
import { getTrackingStepIndex } from '../lib/mockData';
import type { NoticeCard, Opinion } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

export interface VoiceEntry {
  opinion: Opinion;
  noticeCard: NoticeCard | undefined;
  trackingIndex: number;
}

interface UseMyVoiceResult {
  entries: VoiceEntry[];
  status: AsyncStatus;
}

interface MyVoiceResponse {
  ok: boolean;
  entries: { opinion: Opinion; noticeCard: NoticeCard | null }[];
  error?: string;
}

/**
 * 내 목소리(P6) 데이터 로직: 실제 opinions + notices/cards를 조회해 진행 단계를 계산한다.
 * (opinions는 RLS 때문에 브라우저에서 직접 못 읽어 /api/my-voice가 서비스 롤로 대신 읽어준다)
 */
export function useMyVoice(): UseMyVoiceResult {
  const { currentProfileId, voiceVersion } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [entries, setEntries] = useState<VoiceEntry[]>([]);

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

    fetch(`/api/my-voice?profile_id=${encodeURIComponent(currentProfileId)}`)
      .then((res) => res.json() as Promise<MyVoiceResponse>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error);
        setEntries(
          json.entries.map(({ opinion, noticeCard }) => ({
            opinion,
            noticeCard: noticeCard ?? undefined,
            trackingIndex: getTrackingStepIndex(opinion.last_tracking_status),
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
    // voiceVersion이 바뀌면(시간경과 시뮬레이션 등) 진행 단계도 다시 불러온다.
  }, [currentProfileId, voiceVersion]);

  return { entries, status };
}
