interface LoadingStateProps {
  title: string;
  body?: string;
}

export default function LoadingState({ title, body = '잠시만 기다려 주세요.' }: LoadingStateProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-xl border border-border bg-white px-[22px] py-6">
      <p className="text-[10px] font-bold text-navy">확인 중</p>
      <p className="text-[16px] font-bold text-ink">{title}</p>
      <p className="text-[12px] text-muted">{body}</p>
    </div>
  );
}
