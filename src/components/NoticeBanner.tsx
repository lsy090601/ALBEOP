interface NoticeBannerProps {
  variant?: 'default' | 'compact';
}

/** 법적 고지문 공통 컴포넌트. 법안/의견 관련 화면에 일관되게 노출한다. */
export default function NoticeBanner({ variant = 'default' }: NoticeBannerProps) {
  if (variant === 'compact') {
    return (
      <p className="text-[12px] leading-[1.7] text-faint">
        아직 확정된 법이 아니에요 · 알법이 제공하는 내용은 법률 자문이 아니에요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-box bg-surface px-5 py-4 text-[12px] leading-[1.7] text-muted">
      <p>
        이 내용은 입법예고 단계의 법안으로, 아직 확정된 법이 아니에요. 국회 심의 과정에서 바뀔 수
        있어요.
      </p>
      <p>
        알법이 제공하는 요약·의견 초안은 법률 자문이 아니에요. 중요한 판단은 전문가와 상의해 주세요.
      </p>
    </div>
  );
}
