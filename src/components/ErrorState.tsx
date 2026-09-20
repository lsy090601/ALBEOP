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
    <div className="flex w-full flex-col gap-3 rounded-card border-2 border-navy bg-white p-6">
      <p className="text-[12px] font-bold text-navy">{eyebrow}</p>
      <p className="text-[17px] font-bold text-ink">{title}</p>
      <p className="max-w-[560px] text-[13px] leading-[1.6] text-muted">{body}</p>
      {actionLabel && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-1 w-fit">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
