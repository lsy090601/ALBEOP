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
    isSubmittingAnswer,
    isComplete,
    isDrafting,
    draftError,
    draftSummary,
    isEditingDraft,
    toggleEditDraft,
    draftText,
    setDraftText,
    saveDraftEdit,
    confirmDraft,
    regenerateDraft,
  } = useOpinionDraft(id, stance);

  function goToSubmit() {
    confirmDraft();
    if (draftOpinionId) navigate(`/opinion/${draftOpinionId}/submit`);
  }

  function handleToggleEdit() {
    if (isEditingDraft) saveDraftEdit();
    toggleEditDraft();
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
        <div className="flex flex-1 items-stretch">
          <div className="flex flex-1 flex-col gap-4 bg-page px-16 pb-12 pt-12">
            <p className="text-[13px] font-bold text-navy">
              질문 {currentIndex + 1} / {totalQuestions}
            </p>
            <h1 className="max-w-[720px] text-[28px] font-bold leading-[1.4] text-ink">
              경험을 더 구체적으로 들려주세요
            </h1>
            <p className="mb-2 max-w-[720px] text-[14px] leading-[1.7] text-muted">
              한 번에 한 가지씩 물어볼게요. 답변은 오른쪽 초안에 바로 정리됩니다.
            </p>

            {previousExchange && (
              <>
                <div className="flex w-full max-w-[720px] flex-col gap-2 rounded-card border border-border bg-white px-5 py-4">
                  <p className="text-[12px] font-bold text-navy">알법</p>
                  <p className="text-[15px] leading-[1.7] text-ink">{previousExchange.question}</p>
                </div>
                <div className="flex w-fit max-w-[720px] flex-col gap-2 self-end rounded-card bg-navy px-5 py-4 text-right text-white">
                  <p className="text-[12px] font-bold">나</p>
                  <p className="text-[15px] leading-[1.7]">{previousExchange.answer}</p>
                </div>
              </>
            )}

            {!isComplete && (
              <div className="flex w-full max-w-[720px] flex-col gap-2 rounded-card border border-border bg-white px-5 py-4">
                <p className="text-[12px] font-bold text-navy">알법</p>
                <p className="text-[15px] leading-[1.7] text-ink">{currentQuestion}</p>
              </div>
            )}

            {!isComplete ? (
              <>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="답변을 입력하세요"
                  rows={2}
                  disabled={isSubmittingAnswer || !currentQuestion}
                  className="mt-4 w-full max-w-[720px] resize-none rounded-box border border-border bg-white px-5 py-4 text-[14px] leading-[1.7] text-ink placeholder:text-faint focus:border-navy focus:outline-none disabled:opacity-60"
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={submitAnswer}
                  disabled={isSubmittingAnswer || !currentQuestion}
                  className="w-fit"
                >
                  {isSubmittingAnswer ? '질문 준비 중...' : '다음 질문'}
                </Button>
              </>
            ) : (
              <p className="text-[14px] font-medium text-navy">
                모든 질문에 답해 주셔서 감사해요. 오른쪽 초안을 확인해 주세요.
              </p>
            )}

            {draftError && <p className="text-[13px] font-medium text-red-600">{draftError}</p>}
          </div>

          <div className="flex w-[580px] shrink-0 flex-col gap-5 border-l border-border bg-white px-12 pb-12 pt-12">
            <h2 className="text-[24px] font-bold text-ink">의견서 초안</h2>
            <p className="text-[14px] leading-[1.7] text-ink">
              AI가 정리한 문장입니다. 제출 전 반드시 직접 확인하고 수정하세요.
            </p>

            <div className="flex flex-col">
              {isDrafting && (
                <p className="pb-3 text-[13px] font-medium text-navy">
                  AI가 초안을 정리하고 있어요...
                </p>
              )}
              {Object.entries(fieldLabels).map(([key, label]) =>
                draftSummary[key as keyof typeof draftSummary] ? (
                  <div key={key} className="flex flex-col gap-1.5 border-b border-border py-4">
                    <p className="text-[12px] text-muted">{label}</p>
                    <p className="text-[14px] leading-[1.7] text-ink">
                      {draftSummary[key as keyof typeof draftSummary]}
                    </p>
                  </div>
                ) : null,
              )}
              {!isDrafting && Object.keys(draftSummary).length === 0 && (
                <p className="text-[13px] text-muted">답변을 입력하면 이 자리에 초안이 채워져요.</p>
              )}
            </div>

            {isEditingDraft && (
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-box border border-border px-4 py-3 text-[14px] leading-[1.7] text-ink focus:border-navy focus:outline-none"
              />
            )}

            <NoticeBanner variant="compact" />

            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" size="md" onClick={handleToggleEdit} disabled={!draftText}>
                {isEditingDraft ? '수정 저장하기' : '직접 수정하기'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={regenerateDraft}
                disabled={!draftText || isDrafting || isEditingDraft}
              >
                다시 만들기
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={goToSubmit}
                disabled={!isComplete || isDrafting || !draftText}
              >
                제출 안내로 이동
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
