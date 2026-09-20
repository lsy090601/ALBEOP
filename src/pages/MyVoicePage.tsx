import { Link } from 'react-router-dom';
import StatusStepper from '../components/StatusStepper';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useMyVoice } from '../hooks/useMyVoice';
import { TRACKING_STEPS } from '../lib/mockData';

const stanceLabel: Record<string, string> = {
  찬성: '찬성',
  우려: '우려',
  수정: '수정 의견',
};

export default function MyVoicePage() {
  const { entries, status } = useMyVoice();

  return (
    <div className="mx-auto flex w-full max-w-wide flex-col gap-5 px-10 pb-24 pt-20">
      <p className="text-[13px] font-bold text-navy">내가 남긴 의견의 이후</p>
      <h1 className="text-[34px] font-bold leading-[1.3] text-ink">
        내 목소리는 지금 어디까지 갔을까요?
      </h1>
      <p className="mb-2 text-[14px] leading-[1.7] text-muted">
        제출로 끝나지 않도록 법안의 다음 단계를 계속 확인해요.
      </p>

      {status === 'loading' && <LoadingState title="의견 진행 상황을 불러오고 있어요" />}

      {status === 'error' && (
        <ErrorState
          eyebrow="연결 실패"
          title="의견 목록을 불러오지 못했어요"
          body="기존에 작성한 의견은 안전해요. 다시 시도해 주세요."
        />
      )}

      {status === 'success' && entries.length === 0 && (
        <EmptyState
          eyebrow="아직 제출한 의견이 없어요"
          title="첫 의견을 남기면 그 다음도 함께 추적해요"
          body="오늘의 법안에서 내 상황과 맞닿는 변화를 확인하고, 대화로 생각을 정리해 보세요. 제출한 뒤에는 법안이 어디까지 진행됐는지 계속 알려드려요."
          actionLabel="오늘의 관련 법안 보기"
          actionTo="/"
          steps={[
            { number: 1, title: '관련 법안 확인' },
            { number: 2, title: 'AI와 의견 정리' },
            { number: 3, title: '직접 제출' },
            { number: 4, title: '진행 상황 추적' },
          ]}
        />
      )}

      {status === 'success' && entries.length > 0 && (
        <>
          <div className="flex items-center gap-4 rounded-box bg-surface px-5 py-4">
            <span className="shrink-0 text-[13px] font-bold text-navy">최근 변화</span>
            <span className="text-[13px] leading-[1.6] text-ink">
              {entries[0].noticeCard?.card.easy_title} 법안이{' '}
              {entries[0].opinion.last_tracking_status} 단계로 이동했어요
            </span>
          </div>

          {entries.map(({ opinion, noticeCard, trackingIndex }) => (
            <Link
              key={opinion.id}
              to={noticeCard ? `/notice/${noticeCard.notice.id}` : '#'}
              className="flex w-full flex-col gap-3 rounded-card border border-border bg-white px-7 py-6 transition-colors hover:border-line"
            >
              <p className="text-[13px] font-bold text-navy">
                {noticeCard?.card.category} · 내 의견:{' '}
                {opinion.stance ? stanceLabel[opinion.stance] : '-'}
              </p>
              <p className="text-[19px] font-bold text-ink">{noticeCard?.card.easy_title}</p>
              <p className="mb-4 text-[13px] leading-[1.7] text-muted">
                {opinion.last_tracking_status} 중 · 소관위원회 검토 자료가 등록됐어요.
              </p>
              <StatusStepper steps={TRACKING_STEPS} currentIndex={trackingIndex} />
            </Link>
          ))}

          <p className="mt-2 text-[13px] leading-[1.7] text-faint">
            단계명은 이해하기 쉽게 줄여 표시하며, 상세 화면에서 공식 절차명을 함께 제공해요.
          </p>
        </>
      )}
    </div>
  );
}
