import { supabaseAdmin } from './supabaseAdmin.ts';
import { BillSummaryApiError, extractProposalReason, fetchBillSummary } from './billSummary.ts';
import { humanizeReason } from './humanizeError.ts';

export interface GetNoticeDetailResult {
  totalCandidates: number;
  alreadyFilled: number;
  processed: number;
  filled: number;
  emptyOnSource: number;
  failed: number;
  message: string;
}

interface CandidateNotice {
  id: string;
  bill_id: string;
  main_content: string | null;
  proposal_reason: string | null;
  raw_data: Record<string, unknown> | null;
}

async function logDetailRun(noticeId: string, message: string, reason: string | null) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'detail',
    notice_id: noticeId,
    message,
    reason,
    included: null,
  });
  // 로그 기록 자체가 실패해도 상세 조회 결과 응답은 막지 않는다 (콘솔에만 남긴다).
  if (error) console.error('agent_logs insert failed:', error.message);
}

/**
 * score-relevance를 통과한 후보(cards가 있는 notices) 중 본문이 비어 있는 건에
 * "법률안 제안이유 및 주요내용" API(BPMBILLSUMMARY)를 호출해 채운다.
 * 이 API는 제안이유·주요내용을 하나의 SUMMARY 필드로만 내려주므로 전체는 main_content에,
 * 앞 1~2문장(최대 200자)은 proposal_reason에 담는다.
 * main_content가 이미 있고 proposal_reason만 비어 있으면 API를 다시 부르지 않고 추출만 한다.
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/get-notice-detail.ts와 로컬 테스트 스크립트가 공유한다.
 */
export async function runGetNoticeDetail(): Promise<GetNoticeDetailResult> {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLY_API_KEY가 설정되지 않았어요.');
  }

  const { data: cards, error: cardsError } = await supabaseAdmin.from('cards').select('notice_id');
  if (cardsError) throw new Error(`cards 조회 실패: ${cardsError.message}`);

  const candidateIds = [...new Set((cards ?? []).map((c) => c.notice_id as string))];
  if (candidateIds.length === 0) {
    return {
      totalCandidates: 0,
      alreadyFilled: 0,
      processed: 0,
      filled: 0,
      emptyOnSource: 0,
      failed: 0,
      message: '후보(cards)가 없어서 건너뜀',
    };
  }

  const { data: notices, error: noticesError } = await supabaseAdmin
    .from('notices')
    .select('id, bill_id, main_content, proposal_reason, raw_data')
    .in('id', candidateIds);
  if (noticesError) throw new Error(`notices 조회 실패: ${noticesError.message}`);

  const all = (notices ?? []) as CandidateNotice[];
  const pending = all.filter((n) => !n.main_content || !n.proposal_reason);
  const alreadyFilled = all.length - pending.length;

  let filled = 0;
  let emptyOnSource = 0;
  let failed = 0;

  for (const notice of pending) {
    const billName = (notice.raw_data?.BILL_NAME as string | undefined) ?? notice.bill_id;
    try {
      const summary = notice.main_content || (await fetchBillSummary(apiKey, notice.bill_id));
      if (!summary) {
        emptyOnSource += 1;
        await logDetailRun(notice.id, `${billName} → 제안이유 미등록`, null);
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('notices')
        .update({ main_content: summary, proposal_reason: extractProposalReason(summary) })
        .eq('id', notice.id);
      if (updateError) throw new Error(updateError.message);

      filled += 1;
      await logDetailRun(notice.id, `${billName} → 제안이유·주요내용 확보`, null);
    } catch (err) {
      failed += 1;
      const rawReason =
        err instanceof BillSummaryApiError
          ? err.reason
          : err instanceof Error
            ? err.message
            : String(err);
      console.error(`get-notice-detail failed (${billName}):`, rawReason);
      await logDetailRun(notice.id, `${billName} → 제안이유 조회 실패`, humanizeReason(rawReason));
    }
  }

  const message = `후보 ${candidateIds.length}건 중 이미 채워진 ${alreadyFilled}건 제외, ${pending.length}건 처리 → ${filled}건 채움 / ${emptyOnSource}건 미등록 / ${failed}건 실패`;

  return {
    totalCandidates: candidateIds.length,
    alreadyFilled,
    processed: pending.length,
    filled,
    emptyOnSource,
    failed,
    message,
  };
}
