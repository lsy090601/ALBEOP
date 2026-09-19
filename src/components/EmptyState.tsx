import { ButtonLink } from './Button';
import Stepper from './Stepper';

interface EmptyStateProps {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
  steps?: { number: number; title: string }[];
}

/** 결과가 0건일 때 공통으로 쓰는 빈 상태. 문구는 페이지에서 명세서 그대로 전달한다. */
export default function EmptyState({
  eyebrow,
  title,
  body,
  actionLabel,
  actionTo,
  steps,
}: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3.5 rounded-2xl border border-border bg-white px-20 py-[70px]">
      <p className="text-[11px] font-bold text-navy">{eyebrow}</p>
      <p className="max-w-[760px] text-center text-[22px] font-bold text-ink">{title}</p>
      <p className="max-w-[700px] text-center text-[13px] leading-[1.6] text-muted">{body}</p>
      {steps && <Stepper steps={steps} variant="compact" />}
      <ButtonLink to={actionTo} variant="primary" size="md">
        {actionLabel}
      </ButtonLink>
    </div>
  );
}
