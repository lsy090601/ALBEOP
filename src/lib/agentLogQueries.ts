// agent_logs 실제 Supabase 조회 + 실시간 구독. RLS가 select 전체 공개라 anon 키로 바로 읽는다.

import { supabase } from './supabase';
import type { AgentLog } from '../types/database';

const LOG_LIMIT = 100;

export async function fetchAgentLogs(): Promise<AgentLog[]> {
  const { data, error } = await supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(LOG_LIMIT);
  if (error) throw new Error(`agent_logs 조회 실패: ${error.message}`);
  return (data ?? []) as AgentLog[];
}

/** notice_id 목록으로 법안명(공식명 BILL_NAME, 없으면 bill_id)을 조회한다. */
export async function fetchNoticeNames(noticeIds: string[]): Promise<Map<string, string>> {
  if (noticeIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('notices')
    .select('id, bill_id, raw_data')
    .in('id', noticeIds);
  if (error) throw new Error(`notices 조회 실패: ${error.message}`);

  const map = new Map<string, string>();
  for (const n of data ?? []) {
    const billName = (n.raw_data as Record<string, unknown> | null)?.BILL_NAME as
      | string
      | undefined;
    map.set(n.id as string, billName ?? (n.bill_id as string));
  }
  return map;
}

/** agent_logs에 새 행이 INSERT되면 콜백으로 전달한다. 반환값을 호출하면 구독을 해제한다. */
export function subscribeToNewAgentLogs(onInsert: (log: AgentLog) => void): () => void {
  const channel = supabase
    .channel('agent_logs-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'agent_logs' },
      (payload) => onInsert(payload.new as AgentLog),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
