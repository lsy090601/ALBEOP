import { useEffect, useMemo, useState } from 'react';
import { getNoticeCardById, getOpinionByNoticeId, saveOpinion } from '../lib/demoStore';
import type { NoticeCard, OpinionInterviewTurn, OpinionSummary } from '../types/database';
import { useDemoStore } from './useDemoStore';
import type { AsyncStatus } from './asyncStatus';
import { simulateFetch } from './asyncStatus';

const QUESTIONS = [
  { field: 'situation', text: '지금 이 법안과 관련된 상황에 계신가요? 어떤 일을 하고 계세요?' },
  { field: 'concern', text: '이 변화가 생기면 가장 먼저 어떤 점이 걱정되나요?' },
  { field: 'suggestion', text: '이 문제를 해결하기 위한 대안이 있다면 알려주세요.' },
  { field: 'related_clause', text: '관련된 조항이나 근거가 있다면 알려주세요. (선택)' },
  { field: 'title', text: '의견 제목을 어떻게 정하면 좋을까요?' },
] as const satisfies readonly { field: keyof OpinionSummary; text: string }[];

const stanceLabels: Record<string, string> = { 찬성: '찬성', 우려: '우려', 수정: '수정 의견' };

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
  isComplete: boolean;
  draftSummary: OpinionSummary;
  draftText: string;
  isEditingDraft: boolean;
  toggleEditDraft: () => void;
  setDraftText: (value: string) => void;
  confirmDraft: () => void;
}

/**
 * 의견 작성(P4) 인터뷰 + 초안 상태를 관리하는 훅.
 * 완료 시 demoStore.saveOpinion으로 저장한다(추후 Gemini/Supabase insert로 교체될 지점).
 */
export function useOpinionDraft(
  noticeId: string | undefined,
  stance: string | null,
): UseOpinionDraftResult {
  const { currentProfileId } = useDemoStore();
  const [status, setStatus] = useState<AsyncStatus>(noticeId ? 'loading' : 'error');
  const [noticeCard, setNoticeCard] = useState<NoticeCard | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [manualDraftText, setManualDraftText] = useState<string | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;

    simulateFetch(() => ({
      noticeCard: getNoticeCardById(noticeId) ?? null,
      existing: currentProfileId ? getOpinionByNoticeId(currentProfileId, noticeId) : undefined,
    })).then((result) => {
      if (cancelled) return;
      setNoticeCard(result.noticeCard);
      if (result.existing?.summary) {
        const seeded = QUESTIONS.map((q) => result.existing?.summary?.[q.field] ?? '');
        setAnswers(seeded);
        setCurrentIndex(QUESTIONS.length);
      }
      setStatus(result.noticeCard ? 'success' : 'error');
    });

    return () => {
      cancelled = true;
    };
  }, [noticeId, currentProfileId]);

  const isComplete = currentIndex >= QUESTIONS.length;
  const currentQuestion = QUESTIONS[Math.min(currentIndex, QUESTIONS.length - 1)].text;
  const previousExchange =
    currentIndex > 0 && answers[currentIndex - 1]
      ? { question: QUESTIONS[currentIndex - 1].text, answer: answers[currentIndex - 1] }
      : null;

  function submitAnswer() {
    if (!inputValue.trim() || isComplete) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = inputValue.trim();
      return next;
    });
    setInputValue('');
    setCurrentIndex((i) => i + 1);
  }

  const draftSummary: OpinionSummary = useMemo(() => {
    const summary: OpinionSummary = {};
    QUESTIONS.forEach((q, i) => {
      if (answers[i]) summary[q.field] = answers[i];
    });
    return summary;
  }, [answers]);

  const draftText =
    manualDraftText ?? [draftSummary.concern, draftSummary.suggestion].filter(Boolean).join(' ');

  function confirmDraft() {
    if (!noticeId || !currentProfileId) return;
    const interview: OpinionInterviewTurn[] = QUESTIONS.map((q, i) => ({
      question: q.text,
      answer: answers[i] ?? '',
    })).filter((t) => t.answer);

    saveOpinion({
      id: `opinion-${currentProfileId}-${noticeId}`,
      user_id: currentProfileId,
      notice_id: noticeId,
      stance,
      status: 'draft_confirmed',
      interview,
      draft_text: draftText,
      summary: draftSummary,
      submitted: false,
      last_tracking_status: '입법예고 종료',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return {
    noticeCard,
    status,
    draftOpinionId: noticeId && currentProfileId ? `opinion-${currentProfileId}-${noticeId}` : null,
    stanceLabel: stance ? (stanceLabels[stance] ?? stance) : '수정 의견',
    totalQuestions: QUESTIONS.length,
    currentIndex: Math.min(currentIndex, QUESTIONS.length - 1),
    currentQuestion,
    previousExchange,
    inputValue,
    setInputValue,
    submitAnswer,
    isComplete,
    draftSummary,
    draftText,
    isEditingDraft,
    toggleEditDraft: () => setIsEditingDraft((v) => !v),
    setDraftText: setManualDraftText,
    confirmDraft,
  };
}
