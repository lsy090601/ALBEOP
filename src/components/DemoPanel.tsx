import { useState } from 'react';
import { useDemoStore } from '../hooks/useDemoStore';
import { CHAEWON_ID, DOYOON_ID, describeProfileName, getProfileById } from '../lib/mockData';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * 시연용 제어 패널. VITE_DEMO_MODE=true일 때만 렌더링되며,
 * 실제 배포판에는 이 플래그를 꺼서 노출되지 않게 한다.
 */
export default function DemoPanel() {
  const [open, setOpen] = useState(true);
  const store = useDemoStore();

  if (!isDemoMode) return null;

  const otherId = store.currentProfileId === CHAEWON_ID ? DOYOON_ID : CHAEWON_ID;
  const otherProfile = getProfileById(otherId);
  const currentName = describeProfileName(store.currentProfileId);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[260px] rounded-xl border border-navy bg-white shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl bg-navy px-4 py-2.5 text-left text-[12px] font-bold text-white"
      >
        <span>데모 패널</span>
        <span>{open ? '숨기기' : '펼치기'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2.5 p-4 text-[12px]">
          <p className="text-[11px] text-muted">
            현재 프로필: <span className="font-bold text-ink">{currentName ?? '없음'}</span>
          </p>

          <button
            type="button"
            onClick={() => store.switchProfile(otherId)}
            className="rounded-md border border-border px-3 py-2 text-left font-medium text-ink hover:bg-surface"
          >
            프로필 전환 ({currentName ?? '?'} ↔ {otherProfile?.display_name ?? '?'})
          </button>

          <button
            type="button"
            onClick={() => store.runAgentStep()}
            className="rounded-md border border-border px-3 py-2 text-left font-medium text-ink hover:bg-surface"
          >
            에이전트 실행
          </button>

          <button
            type="button"
            onClick={() => store.advanceDay()}
            disabled={!store.currentProfileId}
            className="rounded-md border border-border px-3 py-2 text-left font-medium text-ink hover:bg-surface disabled:opacity-40"
          >
            시간경과 (D-1)
          </button>

          <button
            type="button"
            onClick={() => store.advanceCommittee()}
            disabled={!store.currentProfileId}
            className="rounded-md border border-border px-3 py-2 text-left font-medium text-ink hover:bg-surface disabled:opacity-40"
          >
            시간경과 (위원회 심사)
          </button>

          <button
            type="button"
            onClick={() => store.toggleCacheMode()}
            className="rounded-md border border-border px-3 py-2 text-left font-medium text-ink hover:bg-surface"
          >
            캐시 모드: {store.cacheMode ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => store.resetDemo()}
            className="rounded-md border border-navy px-3 py-2 text-left font-bold text-navy hover:bg-surface"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
