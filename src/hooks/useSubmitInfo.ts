import { useEffect, useState } from 'react';
import { getNoticeCardById, getOpinionById } from '../lib/demoStore';
import type { NoticeCard, Opinion } from '../types/database';
import type { AsyncStatus } from './asyncStatus';
import { simulateFetch } from './asyncStatus';

interface UseSubmitInfoResult {
  opinion: Opinion | null;
  noticeCard: NoticeCard | null;
  status: AsyncStatus;
  copied: boolean;
  copyDraft: () => Promise<void>;
}

/** 제출 안내(P5) 데이터 로직: 완성된 의견서 조회 + 클립보드 복사를 담당한다. */
export function useSubmitInfo(opinionId: string | undefined): UseSubmitInfoResult {
  const [status, setStatus] = useState<AsyncStatus>(opinionId ? 'loading' : 'error');
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!opinionId) return;
    let cancelled = false;

    simulateFetch(() => {
      const foundOpinion = getOpinionById(opinionId) ?? null;
      return {
        opinion: foundOpinion,
        noticeCard: foundOpinion ? (getNoticeCardById(foundOpinion.notice_id) ?? null) : null,
      };
    }).then((result) => {
      if (cancelled) return;
      setOpinion(result.opinion);
      setNoticeCard(result.noticeCard);
      setStatus(result.opinion ? 'success' : 'error');
    });

    return () => {
      cancelled = true;
    };
  }, [opinionId]);

  async function copyDraft() {
    if (!opinion?.draft_text) return;
    try {
      await navigator.clipboard.writeText(opinion.draft_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return { opinion, noticeCard, status, copied, copyDraft };
}
