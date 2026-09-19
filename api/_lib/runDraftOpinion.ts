import { supabaseAdmin } from './supabaseAdmin.ts';
import { GeminiApiError, type GeminiModel } from './gemini.ts';
import { draftOpinionText } from './geminiDraft.ts';
import type { InterviewTurn } from './geminiInterview.ts';
import { humanizeReason } from './humanizeError.ts';

export interface OpinionSummary {
  title?: string;
  related_clause?: string;
  situation?: string;
  concern?: string;
  suggestion?: string;
}

export interface DraftOpinionOptions {
  noticeId?: string;
  profileId?: string;
  opinionId?: string;
  model?: GeminiModel;
  /** 제공되면 Gemini를 다시 부르지 않고, 사용자가 직접 고친 draft_text만 그대로 저장한다("직접 수정하기" 저장). */
  manualDraftText?: string;
  /** true면 이미 draft_confirmed 상태라도 캐시를 쓰지 않고 Gemini를 다시 불러 새로 생성한다("다시 만들기"). */
  regenerate?: boolean;
}

export interface DraftOpinionRunResult {
  opinion_id: string;
  summary: OpinionSummary;
  draft_text: string;
}

interface OpinionRow {
  id: string;
  notice_id: string;
  stance: string | null;
  status: string | null;
  interview: InterviewTurn[] | null;
  summary: OpinionSummary | null;
  draft_text: string | null;
}

interface NoticeForDraft {
  id: string;
  main_content: string | null;
  proposal_reason: string | null;
  raw_data: Record<string, unknown> | null;
}

async function logDraftRun(noticeId: string, message: string, reason: string | null) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'draft',
    notice_id: noticeId,
    message,
    reason,
    included: null,
  });
  if (error) console.error('agent_logs insert failed:', error.message);
}

async function fetchOpinion(options: DraftOpinionOptions): Promise<OpinionRow> {
  let query = supabaseAdmin
    .from('opinions')
    .select('id, notice_id, stance, status, interview, summary, draft_text');
  query = options.opinionId
    ? query.eq('id', options.opinionId)
    : query.eq('user_id', options.profileId ?? '').eq('notice_id', options.noticeId ?? '');

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`opinions 조회 실패: ${error.message}`);
  if (!data) throw new Error('의견 작성이 아직 시작되지 않았어요 (opinions row 없음).');
  return data as OpinionRow;
}

/**
 * 인터뷰 전체 대화를 바탕으로 의견서 초안을 생성해 opinions.summary/draft_text에 저장하고
 * status를 'draft_confirmed'로 바꾼다. HTTP 관련 처리는 하지 않는 순수 함수 —
 * /api/draft-opinion.ts가 이를 감싼다.
 */
export async function runDraftOpinion(
  options: DraftOpinionOptions,
): Promise<DraftOpinionRunResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았어요.');
  const model: GeminiModel = options.model ?? 'flash-lite';

  const opinion = await fetchOpinion(options);
  const stance = opinion.stance ?? '수정';
  const interview = opinion.interview ?? [];

  if (options.manualDraftText?.trim()) {
    const draftText = options.manualDraftText.trim();
    const { error: updateError } = await supabaseAdmin
      .from('opinions')
      .update({ draft_text: draftText, updated_at: new Date().toISOString() })
      .eq('id', opinion.id);
    if (updateError) throw new Error(updateError.message);

    await logDraftRun(opinion.notice_id, '의견서 초안을 직접 수정해 저장했어요', null);
    return { opinion_id: opinion.id, summary: opinion.summary ?? {}, draft_text: draftText };
  }

  // 이미 확정된 초안이 있으면(재생성을 명시적으로 요청하지 않는 한) Gemini를 다시 부르지 않고
  // 저장된 값을 그대로 돌려준다 — 페이지를 다시 열 때마다 매번 새로 생성/과금되는 것을 막는다.
  if (opinion.status === 'draft_confirmed' && !options.regenerate && opinion.draft_text) {
    return { opinion_id: opinion.id, summary: opinion.summary ?? {}, draft_text: opinion.draft_text };
  }

  const { data: notice, error: noticeError } = await supabaseAdmin
    .from('notices')
    .select('id, main_content, proposal_reason, raw_data')
    .eq('id', opinion.notice_id)
    .maybeSingle();
  if (noticeError) throw new Error(`notices 조회 실패: ${noticeError.message}`);
  const typedNotice = notice as NoticeForDraft | null;
  if (!typedNotice) throw new Error('법안 정보를 찾을 수 없어요.');
  if (!typedNotice.main_content) throw new Error('법안 원문이 아직 준비되지 않았어요.');

  const billName = (typedNotice.raw_data?.BILL_NAME as string | undefined) ?? typedNotice.id;

  try {
    const result = await draftOpinionText(
      apiKey,
      {
        billName,
        mainContent: typedNotice.main_content,
        proposalReason: typedNotice.proposal_reason,
        stance,
        interview,
      },
      model,
    );

    const summary: OpinionSummary = {
      title: result.title,
      related_clause: result.related_clause,
      situation: result.situation,
      concern: result.concern,
      suggestion: result.suggestion,
    };

    const { error: updateError } = await supabaseAdmin
      .from('opinions')
      .update({
        summary,
        draft_text: result.draft_text,
        status: 'draft_confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', opinion.id);
    if (updateError) throw new Error(updateError.message);

    const logVerb = options.regenerate ? '재생성' : '생성';
    await logDraftRun(opinion.notice_id, `${billName} 의견서 초안 ${logVerb} 완료 (${stance})`, null);

    return { opinion_id: opinion.id, summary, draft_text: result.draft_text };
  } catch (err) {
    const rawReason =
      err instanceof GeminiApiError ? err.reason : err instanceof Error ? err.message : String(err);
    console.error(`draft-opinion failed (${billName}):`, rawReason);
    await logDraftRun(opinion.notice_id, `${billName} 의견서 초안 생성 실패`, humanizeReason(rawReason));
    throw err;
  }
}
