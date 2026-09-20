import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { Button } from '../components/Button';
import { useHomeData } from '../hooks/useHomeData';
import { useDemoStore } from '../hooks/useDemoStore';
import { describeProfileName, formatDDay, getDaysUntil } from '../lib/mockData';

export default function HomePage() {
  const { currentProfileId } = useDemoStore();
  const displayName = describeProfileName(currentProfileId);
  const {
    status,
    relatedCards,
    otherNotices,
    otherNoticesTotalCount,
    latestRunLabel,
    reload,
    loadMoreOtherNotices,
    loadingMoreOtherNotices,
  } = useHomeData();

  return (
    <div className="min-h-screen bg-white">
      <Navbar mode="app" active="home" trailing={displayName ? `${displayName} 님` : undefined} />
      <div className="mx-auto flex w-full max-w-wide flex-col gap-7 px-10 pb-24 pt-20">
        {!currentProfileId ? (
          <EmptyState
            eyebrow="시작 전이에요"
            title="아직 내 상황이 등록되지 않았어요"
            body="상황을 등록하면 나와 관련된 입법예고만 골라서 보여드려요."
            actionLabel="내 상황 등록하러 가기"
            actionTo="/start"
          />
        ) : (
          <>
            <div className="flex items-start justify-between gap-10">
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-bold text-navy">
                  오늘, {displayName} 님에게 닿은 변화
                </p>
                <h1 className="text-[34px] font-bold leading-[1.3] text-ink">
                  {status === 'success'
                    ? `지금 확인할 법안은 ${relatedCards?.length}건이에요`
                    : '오늘의 법안을 확인하고 있어요'}
                </h1>
                <p className="text-[14px] leading-[1.7] text-muted">
                  생활 조건과 맞닿은 변화만 골라서 보여드려요.
                </p>
              </div>
              {latestRunLabel && (
                <div className="flex w-[240px] shrink-0 flex-col gap-2 rounded-box bg-surface px-5 py-4">
                  <p className="text-[12px] font-bold text-navy">에이전트 활동</p>
                  <p className="text-[13px] leading-[1.6] text-ink">{latestRunLabel} 실행</p>
                  <Link to="/agent" className="text-[12px] font-medium text-navy underline">
                    작업 로그 보기
                  </Link>
                </div>
              )}
            </div>

            <p className="mt-2 text-[19px] font-bold text-ink">나와 관련된 입법예고</p>

            {status === 'loading' && (
              <div className="flex w-full gap-5">
                {[0, 1, 2].map((i) => (
                  <LoadingState key={i} title="새 입법예고를 읽고 있어요" />
                ))}
              </div>
            )}

            {status === 'error' && (
              <ErrorState
                eyebrow="연결 실패"
                title="지금은 국회 데이터를 불러올 수 없어요."
                body="오늘 07:00 기준 저장된 정보를 보여드려요."
                actionLabel="다시 시도하기"
                onAction={reload}
              />
            )}

            {(status === 'success' || status === 'error') &&
              relatedCards &&
              relatedCards.length > 0 && (
                <div className="flex w-full items-stretch gap-5">
                  {relatedCards.map((nc) => (
                    <Card key={nc.notice.id} noticeCard={nc} userName={displayName ?? undefined} />
                  ))}
                </div>
              )}

            {status === 'success' && relatedCards && relatedCards.length === 0 && (
              <EmptyState
                eyebrow="관련 법안 0건"
                title={`오늘은 ${displayName} 님과 관련된 새 입법예고가 없어요.`}
                body="새 법안이 올라오면 바로 알려드릴게요."
                actionLabel="다른 입법예고 보기"
                actionTo="#"
              />
            )}

            {(status === 'success' || status === 'error') &&
              otherNotices &&
              otherNotices.length > 0 && (
                <>
                  <div className="mt-4 flex items-baseline gap-2.5">
                    <p className="text-[19px] font-bold text-ink">관련성이 낮아 걸러진 법안</p>
                    <p className="text-[13px] text-faint">{otherNoticesTotalCount}건</p>
                  </div>
                  <div className="flex w-full flex-col rounded-card border border-border">
                    {otherNotices.map((notice, i) => (
                      <Link
                        key={notice.id}
                        to={`/notice/${notice.id}`}
                        className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface ${
                          i > 0 ? 'border-t border-border' : ''
                        }`}
                      >
                        <p className="text-[14px] font-medium text-ink">
                          {(notice.raw_data?.BILL_NAME as string | undefined) ?? notice.bill_id}
                        </p>
                        <div className="h-px flex-1" />
                        <p className="shrink-0 text-[13px] text-muted">
                          {notice.committee} · {formatDDay(getDaysUntil(notice.notice_end))}
                        </p>
                      </Link>
                    ))}
                  </div>
                  {otherNoticesTotalCount !== undefined &&
                    otherNoticesTotalCount > otherNotices.length && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={loadMoreOtherNotices}
                        disabled={loadingMoreOtherNotices}
                        className="w-fit"
                      >
                        {loadingMoreOtherNotices
                          ? '불러오는 중...'
                          : `${otherNoticesTotalCount - otherNotices.length}건 더 보기`}
                      </Button>
                    )}
                </>
              )}
          </>
        )}
      </div>
    </div>
  );
}
