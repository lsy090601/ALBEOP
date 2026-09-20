import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useNotifications } from '../hooks/useNotifications';
import { getRelativeTime } from '../lib/mockData';

const typeLabel: Record<string, string> = {
  deadline: '마감 임박',
  progress: '진행 상황',
  agent: '에이전트',
};

export default function NotificationsPage() {
  const { entries, status, markRead } = useNotifications();

  return (
    <div className="mx-auto w-full max-w-wide px-10 pb-24 pt-20">
      {/* 바깥은 헤더와 같은 폭, 본문만 좁혀 왼쪽 정렬 — 로고 왼쪽 선과 맞춘다. */}
      <div className="flex w-full max-w-narrow flex-col gap-5">
        <p className="text-[13px] font-bold text-navy">알림함</p>
        <h1 className="text-[34px] font-bold leading-[1.3] text-ink">
          지금 꼭 알아야 할 소식을 모았어요
        </h1>
        <p className="mb-2 text-[14px] leading-[1.7] text-muted">
          마감 임박, 진행 상황 변화를 모아서 보여드려요.
        </p>

        {status === 'loading' && <LoadingState title="알림을 불러오고 있어요" />}

        {status === 'error' && (
          <ErrorState
            eyebrow="연결 실패"
            title="알림을 불러오지 못했어요"
            body="기존 알림 기록은 안전해요. 다시 시도해 주세요."
          />
        )}

        {status === 'success' && entries.length === 0 && (
          <EmptyState
            eyebrow="알림 0건"
            title="아직 받은 알림이 없어요"
            body="마감이 가까워지거나 내가 낸 의견의 진행 상황이 바뀌면 여기로 알려드려요."
            actionLabel="오늘의 관련 법안 보기"
            actionTo="/"
          />
        )}

        {status === 'success' && entries.length > 0 && (
          <div className="flex flex-col">
            {entries.map(({ notification, noticeCard }) => (
              <Link
                key={notification.id}
                to={noticeCard ? `/notice/${noticeCard.notice.id}` : '#'}
                onClick={() => markRead(notification.id)}
                className="flex items-center gap-4 border-b border-border py-5 transition-colors hover:bg-surface"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    notification.is_read ? 'bg-transparent' : 'bg-accent'
                  }`}
                />
                <div className="flex flex-1 flex-col gap-1.5">
                  <p className="text-[14px] font-bold text-ink">
                    {notification.type ? typeLabel[notification.type] : '알림'}
                  </p>
                  <p className="text-[13px] leading-[1.7] text-muted">{notification.message}</p>
                </div>
                <p className="shrink-0 text-[13px] text-muted">
                  {getRelativeTime(notification.created_at)}
                </p>
                <span className="shrink-0 text-[18px] leading-none text-faint">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
