import { useCallback, useEffect, useState } from 'react';
import { fetchNoticeCardById } from '../lib/noticeQueries';
import type { NoticeCard, OpinionInterviewTurn, OpinionSummary } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';

const stanceLabels: Record<string, string> = { 찬성: '찬성', 우려: '우려', 수정: '수정 의견' };

interface InterviewOpinionResponse {
  ok: boolean;
  opinion_id: string;
  done: boolean;
  next_question: string;
  interview: OpinionInterviewTurn[];
  error?: string;
}

interface DraftOpinionResponse {
  ok: boolean;
  opinion_id: string;
  summary: OpinionSummary;
  draft_text: string;
  error?: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { ok: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `요청이 실패했어요 (HTTP ${res.status})`);
  }
  return json;
}

interface UseOpinionDraftResult {
  noticeCard: NoticeCard | null;
  status: AsyncStatus;
  draftOpinionId: string | null;
  stanceLabel: string;
  totalQuestions: number;
  currentIndex: number;
  currentQuestion: string;
  previousExchange: { question: string; answer: string } | null;
  inputValue: string;
  setInputValue: (value: string) => void;
  submitAnswer: () => void;
  isSubmittingAnswer: boolean;
  isComplete: boolean;
  isDrafting: boolean;
  draftError: string | null;
  draftSummary: OpinionSummary;
  draftText: string;
  isEditingDraft: boolean;
  toggleEditDraft: () => void;
  setDraftText: (value: string) => void;
  saveDraftEdit: () => void;
  confirmDraft: () => void;
  regenerateDraft: () => void;
}

/**
 * 의견 작성(P4) 인터뷰 + 초안 상태를 관리하는 훅.
 * interview-opinion/draft-opinion(/api)을 실제로 호출해 Gemini가 질문을 만들고 초안을 정리한다.
 */
export function useOpinionDraft(
  noticeId: string | undefined,
  stance: string | null,
): UseOpinionDraftResult {
  const { currentProfileId } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>(noticeId ? 'loading' : 'error');
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);

  const [opinionId, setOpinionId] = useState<string | null>(null);
  const [interview, setInterview] = useState<OpinionInterviewTurn[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState<OpinionSummary>({});
  const [serverDraftText, setServerDraftText] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [manualDraftText, setManualDraftText] = useState<string | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;

    fetchNoticeCardById(noticeId, currentProfileId)
      .then((card) => {
        if (cancelled) return;
        setNoticeCard(card);
        setStatus(card ? 'success' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [noticeId, currentProfileId]);

  // 법안 정보가 준비되면 첫 질문을 요청한다.
  useEffect(() => {
    if (status !== 'success' || !noticeId || !currentProfileId || opinionId) return;
    let cancelled = false;

    postJson<InterviewOpinionResponse>('/api/interview-opinion', {
      notice_id: noticeId,
      profile_id: currentProfileId,
      stance,
    })
      .then((res) => {
        if (cancelled) return;
        setOpinionId(res.opinion_id);
        setInterview(res.interview);
        setIsComplete(res.done);
      })
      .catch((err) => {
        if (!cancelled) setDraftError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [status, noticeId, currentProfileId, opinionId, stance]);

  const runDraft = useCallback(
    (regenerate = false) => {
      if (!noticeId || !currentProfileId) return;
      setIsDrafting(true);
      setDraftError(null);

      postJson<DraftOpinionResponse>('/api/draft-opinion', {
        notice_id: noticeId,
        profile_id: currentProfileId,
        regenerate,
      })
        .then((res) => {
          setDraftSummary(res.summary);
          setServerDraftText(res.draft_text);
        })
        .catch((err) => setDraftError(err instanceof Error ? err.message : String(err)))
        .finally(() => setIsDrafting(false));
    },
    [noticeId, currentProfileId],
  );

  // 인터뷰가 끝나면 자동으로 초안 생성을 호출한다.
  // (setTimeout으로 감싸 effect 본문에서 동기적으로 setState하지 않도록 한다)
  useEffect(() => {
    if (!isComplete || serverDraftText || isDrafting) return;
    const timer = setTimeout(runDraft, 0);
    return () => clearTimeout(timer);
  }, [isComplete, serverDraftText, isDrafting, runDraft]);

  function submitAnswer() {
    if (!inputValue.trim() || isComplete || !noticeId || !currentProfileId || isSubmittingAnswer) return;
    const answer = inputValue.trim();
    setIsSubmittingAnswer(true);
    setInputValue('');

    postJson<InterviewOpinionResponse>('/api/interview-opinion', {
      notice_id: noticeId,
      profile_id: currentProfileId,
      stance,
      answer,
    })
      .then((res) => {
        setInterview(res.interview);
        setIsComplete(res.done);
      })
      .catch((err) => setDraftError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsSubmittingAnswer(false));
  }

  const completedTurns = interview.filter((t) => t.answer);
  const pendingTurn = interview.find((t) => !t.answer);
  const currentQuestion = pendingTurn?.question ?? '';
  const previousExchange =
    completedTurns.length > 0 ? completedTurns[completedTurns.length - 1] : null;
  const totalQuestions = completedTurns.length + (isComplete ? 0 : 1);
  const currentIndex = Math.min(completedTurns.length, totalQuestions - 1);

  const draftText = manualDraftText ?? serverDraftText;

  function saveDraftEdit() {
    if (!noticeId || !currentProfileId || manualDraftText === null) return;
    postJson<DraftOpinionResponse>('/api/draft-opinion', {
      notice_id: noticeId,
      profile_id: currentProfileId,
      draft_text: manualDraftText,
    })
      .then((res) => setServerDraftText(res.draft_text))
      .catch((err) => setDraftError(err instanceof Error ? err.message : String(err)));
  }

  function confirmDraft() {
    if (manualDraftText !== null) saveDraftEdit();
  }

  function regenerateDraft() {
    setManualDraftText(null);
    setIsEditingDraft(false);
    runDraft(true);
  }

  return {
    noticeCard,
    status,
    draftOpinionId: opinionId,
    stanceLabel: stance ? (stanceLabels[stance] ?? stance) : '수정 의견',
    totalQuestions,
    currentIndex,
    currentQuestion,
    previousExchange,
    inputValue,
    setInputValue,
    submitAnswer,
    isSubmittingAnswer,
    isComplete,
    isDrafting,
    draftError,
    draftSummary,
    draftText,
    isEditingDraft,
    toggleEditDraft: () => setIsEditingDraft((v) => !v),
    setDraftText: setManualDraftText,
    saveDraftEdit,
    confirmDraft,
    regenerateDraft,
  };
}
