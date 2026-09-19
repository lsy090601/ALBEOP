import { Button } from './Button';

interface ErrorStateProps {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** 오류 상태 공통 컴포넌트. "기존 결과는 안전하다"는 신뢰 문구를 항상 함께 보여준다. */
export default function ErrorState({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-xl border-2 border-navy bg-white px-[22px] py-6">
      <p className="text-[10px] font-bold text-navy">{eyebrow}</p>
      <p className="text-[16px] font-bold text-ink">{title}</p>
      <p className="max-w-[520px] text-[12px] leading-[1.5] text-muted">{body}</p>
      {actionLabel && (
        <Button variant="primary" size="sm" onClick={onAction} className="w-fit">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
