interface LoadingStateProps {
  title: string;
  body?: string;
}

export default function LoadingState({ title, body = '잠시만 기다려 주세요.' }: LoadingStateProps) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-card border border-border bg-white p-6 shadow-card">
      <p className="text-[12px] font-bold text-navy">확인 중</p>
      <p className="text-[17px] font-bold text-ink">{title}</p>
      <p className="text-[13px] leading-[1.6] text-muted">{body}</p>
      <div className="mt-1 flex flex-col gap-2">
        <span className="h-3 w-3/5 animate-pulse rounded-full bg-surface" />
        <span className="h-3 w-4/5 animate-pulse rounded-full bg-surface" />
      </div>
    </div>
  );
}
