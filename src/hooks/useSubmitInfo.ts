import { useEffect, useState } from 'react';
import type { NoticeCard, Opinion } from '../types/database';
import type { AsyncStatus } from './asyncStatus';

interface UseSubmitInfoResult {
  opinion: Opinion | null;
  noticeCard: NoticeCard | null;
  status: AsyncStatus;
  copied: boolean;
  copyDraft: () => Promise<void>;
}

interface OpinionResponse {
  ok: boolean;
  opinion: Opinion;
  noticeCard: NoticeCard | null;
  error?: string;
}

/**
 * 제출 안내(P5) 데이터 로직: 실제 opinions를 조회해 완성된 의견서를 보여주고 클립보드 복사를 담당한다.
 * (opinions는 RLS 때문에 브라우저에서 직접 못 읽어 /api/opinion이 서비스 롤로 대신 읽어준다)
 */
export function useSubmitInfo(opinionId: string | undefined): UseSubmitInfoResult {
  const [status, setStatus] = useState<AsyncStatus>(opinionId ? 'loading' : 'error');
  const [opinion, setOpinion] = useState<Opinion | null>(null);
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!opinionId) return;
    let cancelled = false;

    fetch(`/api/opinion?opinion_id=${encodeURIComponent(opinionId)}`)
      .then((res) => res.json() as Promise<OpinionResponse>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error);
        setOpinion(json.opinion);
        setNoticeCard(json.noticeCard);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
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
