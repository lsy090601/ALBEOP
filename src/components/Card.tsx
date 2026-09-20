import { ButtonLink } from './Button';
import type { NoticeCard } from '../types/database';
import { formatDDay, getDaysUntil } from '../lib/mockData';

interface CardProps {
  noticeCard: NoticeCard;
  userName?: string;
}

export default function Card({ noticeCard, userName = '님' }: CardProps) {
  const { notice, card, impact } = noticeCard;
  const dDay = getDaysUntil(notice.notice_end);

  return (
    <div className="flex flex-1 flex-col items-start gap-3 rounded-card border border-border bg-white p-6 shadow-card">
      <p className="text-[12px] font-bold text-navy">
        {card.category} · {formatDDay(dDay)}
      </p>
      <p className="text-[17px] font-bold leading-[1.45] text-ink">{card.easy_title}</p>
      <p className="text-[13px] leading-[1.6] text-muted">{card.one_line}</p>
      {impact?.impact_text && (
        <div className="flex w-full flex-col gap-1.5 rounded-box bg-surface px-4 py-3.5">
          <p className="text-[12px] font-bold text-navy">{userName} 님의 경우</p>
          <p className="line-clamp-2 text-[12px] leading-[1.6] text-muted">{impact.impact_text}</p>
        </div>
      )}
      <ButtonLink to={`/notice/${notice.id}`} variant="primary" size="sm" className="mt-1">
        영향 확인하기
      </ButtonLink>
    </div>
  );
}
