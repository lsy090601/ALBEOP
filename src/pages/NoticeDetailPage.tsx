import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ButtonLink, Button } from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NoticeBanner from '../components/NoticeBanner';
import { useNoticeDetail } from '../hooks/useNoticeDetail';
import { getDaysUntil } from '../lib/mockData';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { noticeCard, isRelevantToCurrentProfile, status } = useNoticeDetail(id);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-page">
      <Navbar mode="detail" />
      <div className="mx-auto w-[960px] max-w-full bg-white pb-14 pt-[38px]">
        {status === 'loading' && <LoadingState title="법안 정보를 불러오고 있어요" />}

        {status === 'error' && (
          <ErrorState
            eyebrow="연결 실패"
            title="법안을 찾을 수 없어요"
            body="목록으로 돌아가 다시 시도해 주세요."
            actionLabel="홈으로"
            onAction={() => navigate('/')}
          />
        )}

        {status === 'success' && noticeCard && (
          <div className="flex flex-col gap-[22px]">
            <p className="text-[12px] font-bold text-navy">
              {noticeCard.card.category} · 마감 D-{getDaysUntil(noticeCard.notice.notice_end)}
            </p>
            <h1 className="text-[30px] font-bold leading-[1.55] text-ink">
              {noticeCard.card.easy_title}
            </h1>

            {noticeCard.card.one_line && (
              <div className="flex flex-col gap-1.5 rounded-[10px] bg-surface px-4 py-[14px]">
                <p className="text-[11px] font-bold text-navy">한 줄 요약</p>
                <p className="text-[14px] font-medium text-ink">{noticeCard.card.one_line}</p>
              </div>
            )}

            {(noticeCard.card.before_text || noticeCard.card.after_text) && (
              <>
                <p className="text-[18px] font-bold text-ink">무엇이 달라지나요</p>
                <div className="flex gap-3.5">
                  <div className="flex-1 rounded-xl border border-border p-[18px]">
                    <p className="text-[12px] font-bold text-ink">지금</p>
                    <p className="mt-2 text-[13px] leading-[1.55] text-muted">
                      {noticeCard.card.before_text}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border-2 border-navy bg-surface p-[18px]">
                    <p className="text-[12px] font-bold text-navy">바뀌면</p>
                    <p className="mt-2 text-[13px] leading-[1.55] text-muted">
                      {noticeCard.card.after_text}
                    </p>
                  </div>
                </div>
              </>
            )}

            {isRelevantToCurrentProfile && noticeCard.card.relevance_reason && (
              <div className="flex flex-col gap-2 rounded-xl bg-navy p-[18px] text-white">
                <p className="text-[11px] font-bold">나에게 중요한 이유</p>
                <p className="text-[14px] font-medium leading-[1.55]">
                  {noticeCard.card.relevance_reason}
                </p>
              </div>
            )}

            {(noticeCard.card.pros?.length || noticeCard.card.cons?.length) && (
              <>
                <p className="text-[18px] font-bold text-ink">균형 있게 살펴보기</p>
                <div className="flex gap-3.5">
                  <div className="flex-1 rounded-xl border border-border p-[18px]">
                    <p className="text-[12px] font-bold text-ink">기대되는 점</p>
                    <p className="mt-2 text-[13px] leading-[1.55] text-muted">
                      {noticeCard.card.pros?.join(' ')}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border border-border p-[18px]">
                    <p className="text-[12px] font-bold text-ink">우려되는 점</p>
                    <p className="mt-2 text-[13px] leading-[1.55] text-muted">
                      {noticeCard.card.cons?.join(' ')}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-2.5">
              <ButtonLink
                to={`/notice/${noticeCard.notice.id}/opinion?stance=찬성`}
                variant="secondary"
                size="sm"
              >
                찬성
              </ButtonLink>
              <ButtonLink
                to={`/notice/${noticeCard.notice.id}/opinion?stance=우려`}
                variant="secondary"
                size="sm"
              >
                우려
              </ButtonLink>
              <ButtonLink
                to={`/notice/${noticeCard.notice.id}/opinion?stance=수정`}
                variant="primary"
                size="sm"
              >
                수정 의견
              </ButtonLink>
              <Button variant="secondary" size="sm">
                잘 모르겠음
              </Button>
            </div>

            <NoticeBanner />
          </div>
        )}
      </div>
    </div>
  );
}
