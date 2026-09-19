import { useEffect, useState } from 'react';
import { fetchAgentLogs, fetchNoticeNames, subscribeToNewAgentLogs } from '../lib/agentLogQueries';
import { getNoticeCardById } from '../lib/demoStore';
import type { AgentLog } from '../types/database';
import { useDemoStore } from './useDemoStore';

export interface AgentLogEntry {
  log: AgentLog;
  /** notice_id가 있을 때의 관련 법안명. 실제 로그는 notices 테이블에서, 데모 연출은 mock 데이터에서 가져온다. */
  noticeName: string | undefined;
  /** 데모 패널 "에이전트 실행" 버튼이 만든 연출용 로그인지(실제 agent_logs 테이블에는 안 쓰임) */
  isMock: boolean;
}

interface UseAgentLogResult {
  entries: AgentLogEntry[];
  isEmpty: boolean;
}

/**
 * 에이전트 작업 로그(P8) 데이터 로직. 실제 agent_logs를 조회 + 실시간(Realtime) 구독한다.
 * 데모 패널 "에이전트 실행" 연출 로그(demoStore.runAgentStep)는 실제 테이블에 쓰지 않으므로
 * 별도로 합쳐서 보여주되 isMock으로 구분한다.
 */
export function useAgentLog(): UseAgentLogResult {
  const { agentLogs: mockLogs } = useDemoStore();
  const [realLogs, setRealLogs] = useState<AgentLog[]>([]);
  const [noticeNames, setNoticeNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    fetchAgentLogs()
      .then(async (logs) => {
        if (cancelled) return;
        setRealLogs(logs);
        const ids = [...new Set(logs.map((l) => l.notice_id).filter((id): id is string => !!id))];
        const names = await fetchNoticeNames(ids);
        if (!cancelled) setNoticeNames(names);
      })
      .catch((err) => console.error('agent_logs 조회 실패:', err));

    const unsubscribe = subscribeToNewAgentLogs((log) => {
      setRealLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [log, ...prev]));
      if (log.notice_id) {
        fetchNoticeNames([log.notice_id]).then((names) => {
          setNoticeNames((prev) => new Map([...prev, ...names]));
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const realEntries: AgentLogEntry[] = realLogs.map((log) => ({
    log,
    noticeName: log.notice_id ? noticeNames.get(log.notice_id) : undefined,
    isMock: false,
  }));

  const mockEntries: AgentLogEntry[] = mockLogs.map((log) => ({
    log,
    noticeName: log.notice_id ? (getNoticeCardById(log.notice_id)?.card.easy_title ?? undefined) : undefined,
    isMock: true,
  }));

  const entries = [...realEntries, ...mockEntries].sort((a, b) =>
    a.log.created_at < b.log.created_at ? 1 : -1,
  );

  return { entries, isEmpty: entries.length === 0 };
}
