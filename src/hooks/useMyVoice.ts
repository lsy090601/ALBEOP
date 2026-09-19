import { useEffect, useState } from 'react';
import { getNoticeCardById, getOpinionsForProfile } from '../lib/demoStore';
import { getTrackingStepIndex } from '../lib/mockData';
import type { NoticeCard, Opinion } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';
import { simulateFetch } from './asyncStatus';

export interface VoiceEntry {
  opinion: Opinion;
  noticeCard: NoticeCard | undefined;
  trackingIndex: number;
}

interface UseMyVoiceResult {
  entries: VoiceEntry[];
  status: AsyncStatus;
}

/** 내 목소리(P6) 데이터 로직: 현재 프로필의 의견 + 연결된 법안 + 진행 단계를 계산한다. */
export function useMyVoice(): UseMyVoiceResult {
  const { currentProfileId, opinions } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [entries, setEntries] = useState<VoiceEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    simulateFetch(() => {
      const all = getOpinionsForProfile(currentProfileId);
      // 제출된 의견은 항상 그대로 보여주고, 임시저장 초안끼리만 notice_id당 최신 1건으로 줄인다.
      const submitted = all.filter((o) => o.status === 'submitted');
      const latestDraftByNotice = new Map<string, Opinion>();
      for (const opinion of all) {
        if (opinion.status === 'submitted') continue;
        const prev = latestDraftByNotice.get(opinion.notice_id);
        if (!prev || opinion.updated_at > prev.updated_at) {
          latestDraftByNotice.set(opinion.notice_id, opinion);
        }
      }
      return [...submitted, ...latestDraftByNotice.values()].map((opinion) => ({
        opinion,
        noticeCard: getNoticeCardById(opinion.notice_id),
        trackingIndex: getTrackingStepIndex(opinion.last_tracking_status),
      }));
    })
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
    // opinions가 바뀌면(시간경과 시뮬레이션) 진행 단계도 다시 계산한다.
  }, [currentProfileId, opinions]);

  return { entries, status };
}
