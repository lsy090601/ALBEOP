import { ButtonLink } from './Button';
import type { NoticeCard } from '../types/database';
import { getDaysUntil } from '../lib/mockData';

interface CardProps {
  noticeCard: NoticeCard;
  userName?: string;
}

export default function Card({ noticeCard, userName = '님' }: CardProps) {
  const { notice, card } = noticeCard;
  const dDay = getDaysUntil(notice.notice_end);

  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-xl border border-border bg-white p-[18px]">
      <p className="text-[11px] font-bold text-navy">
        {card.category} · 마감 D-{dDay}
      </p>
      <p className="text-[15px] font-bold leading-[1.55] text-ink">{card.easy_title}</p>
      <p className="text-[12px] leading-[1.55] text-muted">{card.one_line}</p>
      {card.relevance_reason && (
        <div className="flex w-full flex-col gap-1 rounded-lg bg-surface px-3 py-2.5">
          <p className="text-[10px] font-bold text-navy">{userName} 님의 경우</p>
          <p className="line-clamp-2 text-[11px] leading-[1.55] text-muted">
            {card.relevance_reason}
          </p>
        </div>
      )}
      <ButtonLink to={`/notice/${notice.id}`} variant="primary" size="sm" fullWidth>
        영향 확인하기
      </ButtonLink>
    </div>
  );
}
