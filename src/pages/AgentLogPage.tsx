import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import { Button } from '../components/Button';
import { useAgentLog } from '../hooks/useAgentLog';
import { useDemoStore } from '../hooks/useDemoStore';
import { getRelativeTime } from '../lib/mockData';

const stepColor: Record<string, string> = {
  수집: 'bg-faint',
  선별: 'bg-navy',
  요약: 'bg-navy-soft',
  완료: 'bg-navy',
};

export default function AgentLogPage() {
  const { entries, isEmpty } = useAgentLog();
  const { runAgentStep } = useDemoStore();

  return (
    <div className="min-h-screen bg-page">
      <Navbar mode="app" active="agent" />
      <div className="mx-auto flex w-[960px] max-w-full flex-col gap-[22px] bg-white pb-14 pt-11">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-bold text-navy">투명하게 공개해요</p>
            <h1 className="text-[30px] font-bold text-ink">에이전트 작업 로그</h1>
            <p className="text-[14px] text-muted">
              무엇을 왜 골랐는지, 무엇을 왜 제외했는지를 그대로 보여드려요.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => runAgentStep()}>
            에이전트 실행
          </Button>
        </div>

        {isEmpty && (
          <EmptyState
            eyebrow="실행 기록 0건"
            title="아직 실행 기록이 없어요"
            body="에이전트를 실행하면 수집·선별·요약 단계가 순서대로 여기에 기록돼요."
            actionLabel="에이전트 실행"
            actionTo="/agent"
          />
        )}

        {!isEmpty && (
          <div className="flex flex-col gap-3">
            {entries.map(({ log, noticeCard }) => (
              <div key={log.id} className="flex gap-3 rounded-xl border border-border p-4">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${stepColor[log.step ?? ''] ?? 'bg-faint'}`}
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-navy">{log.step}</span>
                    <span className="text-[11px] text-faint">
                      {getRelativeTime(log.created_at)}
                    </span>
                    {log.included !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          log.included ? 'bg-navy text-white' : 'bg-surface text-muted'
                        }`}
                      >
                        {log.included ? '포함' : '제외'}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-[1.55] text-ink">{log.message}</p>
                  {log.reason && (
                    <p className="text-[12px] leading-[1.5] text-muted">근거 · {log.reason}</p>
                  )}
                  {noticeCard && (
                    <p className="text-[11px] text-navy">관련 법안: {noticeCard.card.easy_title}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
