import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ButtonLink, Button } from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NoticeBanner from '../components/NoticeBanner';
import { useNoticeDetail } from '../hooks/useNoticeDetail';
import { useDemoStore } from '../hooks/useDemoStore';
import { describeProfileName, formatDDay, getDaysUntil } from '../lib/mockData';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { noticeCard, status } = useNoticeDetail(id);
  const { currentProfileId } = useDemoStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar mode="detail" />
      <div className="mx-auto w-full max-w-default px-10 pb-24 pt-20">
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

        {status === 'success' && noticeCard && !noticeCard.card && (
          <div className="flex flex-col gap-6">
            <p className="text-[13px] font-bold text-navy">
              {noticeCard.notice.committee ?? '소관위원회 미정'} ·{' '}
              {formatDDay(getDaysUntil(noticeCard.notice.notice_end))}
            </p>
            <h1 className="text-[30px] font-bold leading-[1.35] text-ink">
              {(noticeCard.notice.raw_data?.BILL_NAME as string | undefined) ?? '법률안명 미확인'}
            </h1>

            <div className="rounded-box bg-surface px-6 py-5 text-[14px] leading-[1.7] text-navy">
              이 법안은 아직 {describeProfileName(currentProfileId) ?? '회원'} 님 기준으로 개인화
              분석을 하지 않았어요.
            </div>

            <div className="flex flex-col gap-2 rounded-card border border-border px-6 py-5">
              <p className="text-[12px] font-bold text-navy">제안이유</p>
              <p className="text-[14px] leading-[1.7] text-ink">
                {noticeCard.notice.proposal_reason ?? '아직 원문을 확인하지 못했어요.'}
              </p>
            </div>

            {noticeCard.notice.source_url && (
              <a
                href={noticeCard.notice.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center justify-center rounded-btn bg-navy px-[22px] py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-navy-soft"
              >
                원문 보기
              </a>
            )}

            <NoticeBanner />
          </div>
        )}

        {status === 'success' && noticeCard && noticeCard.card && (
          <div className="flex flex-col gap-6">
            <p className="text-[13px] font-bold text-navy">
              {noticeCard.card.category} · {formatDDay(getDaysUntil(noticeCard.notice.notice_end))}
            </p>
            <h1 className="text-[34px] font-bold leading-[1.35] text-ink">
              {noticeCard.card.easy_title}
            </h1>

            {noticeCard.card.one_line && (
              <div className="flex flex-col gap-2 rounded-box bg-surface px-6 py-5">
                <p className="text-[12px] font-bold text-navy">한 줄 요약</p>
                <p className="text-[15px] leading-[1.65] text-ink">{noticeCard.card.one_line}</p>
              </div>
            )}

            {(noticeCard.card.before_text || noticeCard.card.after_text) && (
              <>
                <p className="mt-2 text-[19px] font-bold text-ink">무엇이 달라지나요</p>
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-2.5 rounded-card border border-border bg-white p-6">
                    <p className="text-[13px] font-bold text-ink">지금</p>
                    <p className="text-[13px] leading-[1.7] text-muted">
                      {noticeCard.card.before_text}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 rounded-card border-2 border-navy bg-white p-6">
                    <p className="text-[13px] font-bold text-navy">바뀌면</p>
                    <p className="text-[13px] leading-[1.7] text-muted">
                      {noticeCard.card.after_text}
                    </p>
                  </div>
                </div>
              </>
            )}

            {noticeCard.impact?.impact_text &&
              (noticeCard.impact.is_relevant === false ? (
                <div className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-6">
                  <p className="text-[12px] font-bold text-muted">나에게는 해당하지 않아요</p>
                  <p className="text-[15px] leading-[1.7] text-ink">
                    {noticeCard.impact.impact_text}
                  </p>
                  {noticeCard.impact.calculation_basis && (
                    <p className="text-[12px] leading-[1.7] text-faint">
                      판단 근거 · {noticeCard.impact.calculation_basis}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 rounded-card bg-navy p-6 text-white">
                  <p className="text-[12px] font-bold">
                    {noticeCard.impact.is_relevant === null
                      ? '확인이 더 필요해요'
                      : '나에게 중요한 이유'}
                  </p>
                  <p className="text-[15px] leading-[1.7]">{noticeCard.impact.impact_text}</p>
                  {noticeCard.impact.calculation_basis && (
                    <p className="text-[12px] leading-[1.7] text-proof">
                      판단 근거 · {noticeCard.impact.calculation_basis}
                    </p>
                  )}
                </div>
              ))}

            {(noticeCard.card.pros?.length || noticeCard.card.cons?.length) && (
              <>
                <p className="mt-2 text-[19px] font-bold text-ink">균형 있게 살펴보기</p>
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-2.5 rounded-card border border-border bg-white p-6">
                    <p className="text-[13px] font-bold text-ink">기대되는 점</p>
                    <p className="text-[13px] leading-[1.7] text-muted">
                      {noticeCard.card.pros?.join(' ')}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 rounded-card border border-border bg-white p-6">
                    <p className="text-[13px] font-bold text-ink">우려되는 점</p>
                    <p className="text-[13px] leading-[1.7] text-muted">
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
