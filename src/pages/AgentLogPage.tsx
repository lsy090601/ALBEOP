import EmptyState from '../components/EmptyState';
import { Button } from '../components/Button';
import { useAgentLog } from '../hooks/useAgentLog';
import { useDemoStore } from '../hooks/useDemoStore';
import { getRelativeTime } from '../lib/mockData';

// 실제 /api 함수들이 쓰는 step 값(collect/filter/detail/analyze/match/interview/draft/track) → 화면 라벨.
// 데모 연출은 한글 라벨을 그대로 step에 넣으므로 매핑에 없으면 step 값 자체를 보여준다.
const stepLabel: Record<string, string> = {
  collect: '수집',
  filter: '선별',
  detail: '상세조회',
  analyze: '분석',
  match: '매칭',
  interview: '인터뷰',
  draft: '초안 작성',
  track: '진행 추적',
};

const stepColor: Record<string, string> = {
  collect: 'bg-faint',
  filter: 'bg-navy-soft',
  detail: 'bg-faint',
  analyze: 'bg-navy',
  match: 'bg-navy',
  interview: 'bg-navy-soft',
  draft: 'bg-navy-soft',
  track: 'bg-navy',
};

export default function AgentLogPage() {
  const { entries, isEmpty } = useAgentLog();
  const { runAgentStep } = useDemoStore();

  return (
    <div className="mx-auto flex w-full max-w-wide flex-col gap-7 px-10 pb-24 pt-20">
      <div className="flex items-start justify-between gap-10">
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-bold text-navy">투명하게 공개해요</p>
          <h1 className="text-[34px] font-bold leading-[1.3] text-ink">에이전트 작업 로그</h1>
          <p className="text-[14px] leading-[1.7] text-muted">
            무엇을 왜 골랐는지, 무엇을 왜 제외했는지를 그대로 보여드려요.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => runAgentStep()} className="shrink-0">
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
          {entries.map(({ log, noticeName, isMock }) => (
            <div
              key={log.id}
              className={`flex gap-3.5 rounded-card border border-border p-5 ${
                isMock ? 'bg-surface' : 'bg-white shadow-card'
              }`}
            >
              <span
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${stepColor[log.step ?? ''] ?? 'bg-faint'}`}
              />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] font-bold text-navy">
                    {stepLabel[log.step ?? ''] ?? log.step}
                  </span>
                  <span className="text-[12px] text-faint">{getRelativeTime(log.created_at)}</span>
                  {log.included !== null && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        log.included ? 'bg-navy text-white' : 'bg-surface-strong text-muted'
                      }`}
                    >
                      {log.included ? '포함' : '제외'}
                    </span>
                  )}
                  {isMock && (
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-faint">
                      연출
                    </span>
                  )}
                </div>
                <p className="text-[14px] leading-[1.7] text-ink">{log.message}</p>
                {log.reason && (
                  <p className="text-[13px] leading-[1.7] text-muted">근거 · {log.reason}</p>
                )}
                {noticeName && (
                  <p className="text-[12px] font-medium text-navy">관련 법안: {noticeName}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
