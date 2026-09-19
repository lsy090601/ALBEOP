import { supabaseAdmin } from './supabaseAdmin.ts';
import { AssemblyApiError, fetchAllNotices } from './assembly.ts';
import { normalizeDate } from './normalizeDate.ts';
import type { AssemblyNoticeRow } from './assembly.ts';

export interface FetchNoticesResult {
  fetched: number;
  saved: number;
  skipped: number;
  message: string;
}

async function logAgentRun(message: string, reason: string | null = null) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'collect',
    message,
    reason,
    notice_id: null,
    included: null,
  });
  // 로그 기록 자체가 실패해도 수집 결과 응답은 막지 않는다 (콘솔에만 남긴다).
  if (error) console.error('agent_logs insert failed:', error.message);
}

function toNoticeRow(row: AssemblyNoticeRow) {
  return {
    bill_id: row.BILL_NO as string,
    committee: row.CURR_COMMITTEE ?? null,
    notice_end: normalizeDate(row.NOTI_ED_DT),
    source_url: row.LINK_URL ?? null,
    raw_data: row,
    // propose_date / proposal_reason / main_content / current_law_text는 이 API에 없는 값이라
    // TODO: 다음 단계 "법률안 제안이유 및 주요내용" API로 채울 예정 — 여기서는 일부러 페이로드에서
    // 빼서 재실행 시 이미 채워진 값을 null로 덮어쓰지 않도록 한다.
  };
}

/**
 * 열린국회정보 "진행중 입법예고" API를 호출해 notices에 upsert하고 agent_logs에 기록한다.
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/fetch-notices.ts와 로컬 테스트 스크립트가 공유한다.
 */
export async function runFetchNotices(): Promise<FetchNoticesResult> {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    await logAgentRun('[수집] 실패 · 응답 없음', 'ASSEMBLY_API_KEY 환경변수가 설정되지 않음');
    throw new Error('ASSEMBLY_API_KEY가 설정되지 않았어요.');
  }

  let rows: AssemblyNoticeRow[];
  try {
    rows = await fetchAllNotices(apiKey);
  } catch (err) {
    if (err instanceof AssemblyApiError) {
      await logAgentRun(err.message, err.reason);
      throw err;
    }
    const message = '[수집] 실패 · 응답 없음';
    await logAgentRun(message, err instanceof Error ? err.message : String(err));
    throw new Error(message, { cause: err });
  }

  const payload = rows.filter((row) => row.BILL_NO).map(toNoticeRow);
  const skipped = rows.length - payload.length;

  const { data, error } = await supabaseAdmin
    .from('notices')
    .upsert(payload, { onConflict: 'bill_id' })
    .select('id');

  if (error) {
    const message = '[수집] 실패 · 응답 없음';
    await logAgentRun(message, `Supabase upsert error: ${error.message}`);
    throw new Error(message);
  }

  const saved = data?.length ?? 0;
  const message = `오늘 새로 시작된 입법예고 ${saved}건을 가져왔어요`;
  await logAgentRun(message);

  return { fetched: rows.length, saved, skipped, message };
}
