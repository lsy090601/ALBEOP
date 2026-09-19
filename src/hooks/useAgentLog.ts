import { useMemo } from 'react';
import { getAgentLogs, getNoticeCardById } from '../lib/demoStore';
import type { AgentLog, NoticeCard } from '../types/database';
import { useDemoStore } from './useDemoStore';

export interface AgentLogEntry {
  log: AgentLog;
  noticeCard: NoticeCard | undefined;
}

interface UseAgentLogResult {
  entries: AgentLogEntry[];
  isEmpty: boolean;
}

/**
 * 에이전트 작업 로그(P8) 데이터 로직.
 * 데모에서는 useDemoStore(useSyncExternalStore)가 상태 변경 즉시 리렌더를 트리거하므로
 * demoStore.runAgentStep()이 새 로그를 push하는 순간 이 훅의 반환값도 바로 갱신된다.
 * 실제 서비스에서는 이 훅 내부를
 * `supabase.channel('agent_logs').on('postgres_changes', { event: 'INSERT', table: 'agent_logs' }, ...)`
 * 구독으로 교체하면 된다.
 */
export function useAgentLog(): UseAgentLogResult {
  const { agentLogs } = useDemoStore();

  const entries = useMemo<AgentLogEntry[]>(
    () =>
      getAgentLogs().map((log) => ({
        log,
        noticeCard: log.notice_id ? getNoticeCardById(log.notice_id) : undefined,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- agentLogs 참조 변경이 재계산 트리거
    [agentLogs],
  );

  return { entries, isEmpty: entries.length === 0 };
}
