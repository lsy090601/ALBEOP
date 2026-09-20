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
    <div className="flex w-full flex-col items-center gap-4 rounded-hero border border-border bg-white px-20 py-[90px]">
      <p className="text-[12px] font-bold text-navy">{eyebrow}</p>
      <p className="max-w-[760px] text-center text-[22px] font-bold text-ink">{title}</p>
      <p className="max-w-[700px] whitespace-pre-line text-center text-[14px] leading-[1.7] text-muted">
        {body}
      </p>
      {steps && (
        <div className="mt-2">
          <Stepper steps={steps} variant="compact" />
        </div>
      )}
      <ButtonLink to={actionTo} variant="primary" size="md" className="mt-3">
        {actionLabel}
      </ButtonLink>
    </div>
  );
}
