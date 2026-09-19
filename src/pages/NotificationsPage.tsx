import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
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
    <div className="min-h-screen bg-page">
      <Navbar mode="app" active="notifications" />
      <div className="mx-auto flex w-[960px] max-w-full flex-col gap-[22px] bg-white pb-14 pt-11">
        <p className="text-[12px] font-bold text-navy">놓치지 않도록</p>
        <h1 className="text-[30px] font-bold text-ink">알림함</h1>
        <p className="text-[14px] text-muted">마감 임박, 진행 상황 변화를 모아서 보여드려요.</p>

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
          <div className="flex flex-col gap-2.5">
            {entries.map(({ notification, noticeCard }) => (
              <Link
                key={notification.id}
                to={noticeCard ? `/notice/${noticeCard.notice.id}` : '#'}
                onClick={() => markRead(notification.id)}
                className={`flex items-start gap-3 rounded-xl border px-[18px] py-4 ${
                  notification.is_read ? 'border-border bg-white' : 'border-navy bg-surface'
                }`}
              >
                <span className="mt-0.5 shrink-0 text-[10px] font-bold text-navy">
                  {notification.type ? typeLabel[notification.type] : '알림'}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[13px] leading-[1.55] text-ink">{notification.message}</p>
                  <p className="text-[11px] text-muted">
                    {getRelativeTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-navy" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
