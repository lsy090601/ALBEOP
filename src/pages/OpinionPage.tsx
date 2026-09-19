import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NoticeBanner from '../components/NoticeBanner';
import { useOpinionDraft } from '../hooks/useOpinionDraft';

const fieldLabels: Record<string, string> = {
  title: '의견 제목',
  related_clause: '관련 조항',
  situation: '내 경험',
  concern: '의견 내용',
  suggestion: '대안 제안',
};

export default function OpinionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const stance = searchParams.get('stance');
  const navigate = useNavigate();

  const {
    noticeCard,
    status,
    draftOpinionId,
    totalQuestions,
    currentIndex,
    currentQuestion,
    previousExchange,
    inputValue,
    setInputValue,
    submitAnswer,
    isComplete,
    draftSummary,
    isEditingDraft,
    toggleEditDraft,
    draftText,
    setDraftText,
    confirmDraft,
  } = useOpinionDraft(id, stance);

  function goToSubmit() {
    confirmDraft();
    if (draftOpinionId) navigate(`/opinion/${draftOpinionId}/submit`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar mode="minimal" title={noticeCard?.card.easy_title ?? undefined} />

      {status === 'loading' && (
        <div className="p-14">
          <LoadingState title="법안 정보를 불러오고 있어요" />
        </div>
      )}

      {status === 'error' && (
        <div className="p-14">
          <ErrorState
            eyebrow="연결 실패"
            title="의견 작성 화면을 열 수 없어요"
            body="법안 정보를 확인하지 못했어요. 다시 시도해 주세요."
          />
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-1 items-start">
          <div className="flex flex-1 flex-col gap-[18px] bg-page px-[72px] pb-8 pt-10">
            <p className="text-[11px] font-bold text-navy">
              질문 {currentIndex + 1} / {totalQuestions}
            </p>
            <h1 className="w-[716px] max-w-full text-[24px] font-bold leading-[1.55] text-ink">
              경험을 더 구체적으로 들려주세요
            </h1>
            <p className="w-[716px] max-w-full text-[13px] text-muted">
              한 번에 한 가지씩 물어볼게요. 답변은 오른쪽 초안에 바로 정리됩니다.
            </p>

            {previousExchange && (
              <>
                <div className="flex w-fit max-w-[638px] flex-col gap-1.5 rounded-xl border border-border px-[18px] py-4">
                  <p className="text-[10px] font-bold text-navy">알법</p>
                  <p className="text-[14px] leading-[1.55] text-ink">{previousExchange.question}</p>
                </div>
                <div className="flex w-fit max-w-[716px] flex-col gap-1.5 self-end rounded-xl border border-navy bg-navy px-[18px] py-4 text-white">
                  <p className="text-[10px] font-bold">나</p>
                  <p className="text-[14px] leading-[1.55]">{previousExchange.answer}</p>
                </div>
              </>
            )}

            {!isComplete && (
              <div className="flex w-fit max-w-[638px] flex-col gap-1.5 rounded-xl border border-border px-[18px] py-4">
                <p className="text-[10px] font-bold text-navy">알법</p>
                <p className="text-[14px] leading-[1.55] text-ink">{currentQuestion}</p>
              </div>
            )}

            {!isComplete ? (
              <>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="답변을 입력하세요"
                  rows={2}
                  className="w-full rounded-[10px] border border-border px-4 py-[14px] text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-navy"
                />
                <Button variant="primary" size="sm" onClick={submitAnswer} className="w-fit">
                  다음 질문
                </Button>
              </>
            ) : (
              <p className="text-[13px] font-medium text-navy">
                모든 질문에 답해 주셔서 감사해요. 오른쪽 초안을 확인해 주세요.
              </p>
            )}
          </div>

          <div className="flex w-[580px] shrink-0 flex-col gap-4 border border-border bg-white px-10 pb-8 pt-10">
            <h2 className="text-[22px] font-bold text-ink">의견서 초안</h2>
            <p className="text-[12px] font-medium text-navy">
              AI가 정리한 문장입니다. 제출 전 반드시 직접 확인하고 수정하세요.
            </p>

            <div className="flex flex-col gap-3">
              {Object.entries(fieldLabels).map(([key, label]) =>
                draftSummary[key as keyof typeof draftSummary] ? (
                  <div key={key} className="flex flex-col gap-1 border-b border-border pb-3">
                    <p className="text-[10px] font-bold text-muted">{label}</p>
                    <p className="text-[13px] text-ink">
                      {draftSummary[key as keyof typeof draftSummary]}
                    </p>
                  </div>
                ) : null,
              )}
              {Object.keys(draftSummary).length === 0 && (
                <p className="text-[12px] text-muted">답변을 입력하면 이 자리에 초안이 채워져요.</p>
              )}
            </div>

            {isEditingDraft && (
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={4}
                className="w-full rounded-[10px] border border-border px-4 py-3 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-navy"
              />
            )}

            <NoticeBanner variant="compact" />

            <div className="flex gap-2.5">
              <Button variant="secondary" size="md" onClick={toggleEditDraft}>
                직접 수정하기
              </Button>
              <Button variant="primary" size="md" onClick={goToSubmit} disabled={!isComplete}>
                제출 안내로 이동
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
