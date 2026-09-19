import { supabaseAdmin } from './supabaseAdmin.ts';
import { GeminiApiError, type GeminiModel } from './gemini.ts';
import { judgeNextInterviewStep, type InterviewTurn } from './geminiInterview.ts';

export interface InterviewOpinionOptions {
  noticeId: string;
  profileId: string;
  /** 새 opinion row를 만들 때만 쓰인다. 기존 row가 있으면 그 stance를 그대로 유지한다. */
  stance?: string;
  /** 직전에 던진 질문(interview 배열의 마지막 미답변 항목)에 대한 답변. 첫 호출이면 없음. */
  answer?: string;
  model?: GeminiModel;
}

export interface InterviewOpinionResult {
  opinion_id: string;
  done: boolean;
  next_question: string;
  interview: InterviewTurn[];
}

interface NoticeForInterview {
  id: string;
  main_content: string | null;
  raw_data: Record<string, unknown> | null;
}

async function logInterviewRun(noticeId: string, message: string, reason: string | null) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'interview',
    notice_id: noticeId,
    message,
    reason,
    included: null,
  });
  if (error) console.error('agent_logs insert failed:', error.message);
}

async function fetchImpactText(noticeId: string, profileId: string): Promise<string | null> {
  const { data: card } = await supabaseAdmin
    .from('cards')
    .select('id')
    .eq('notice_id', noticeId)
    .maybeSingle();
  if (!card) return null;

  const { data: impact } = await supabaseAdmin
    .from('card_impacts')
    .select('impact_text')
    .eq('card_id', card.id)
    .eq('profile_id', profileId)
    .maybeSingle();
  return (impact?.impact_text as string | undefined) ?? null;
}

/**
 * 대화 한 턴을 진행한다: opinions row를 찾거나 만들고, 답변이 왔으면 직전 질문을 완결한 뒤,
 * 다음 질문을 Gemini로 생성하거나(아직 부족하면) 인터뷰 종료를 신호한다(충분히 구체화됐으면).
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/interview-opinion.ts가 이를 감싼다.
 */
export async function runInterviewOpinion(
  options: InterviewOpinionOptions,
): Promise<InterviewOpinionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았어요.');
  const model: GeminiModel = options.model ?? 'flash-lite';
  const { noticeId, profileId } = options;

  const { data: notice, error: noticeError } = await supabaseAdmin
    .from('notices')
    .select('id, main_content, raw_data')
    .eq('id', noticeId)
    .maybeSingle();
  if (noticeError) throw new Error(`notices 조회 실패: ${noticeError.message}`);
  const typedNotice = notice as NoticeForInterview | null;
  if (!typedNotice) throw new Error('법안 정보를 찾을 수 없어요.');
  if (!typedNotice.main_content) throw new Error('법안 원문이 아직 준비되지 않았어요.');

  const billName =
    (typedNotice.raw_data?.BILL_NAME as string | undefined) ?? typedNotice.id;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('opinions')
    .select('id, stance, status, interview')
    .eq('user_id', profileId)
    .eq('notice_id', noticeId)
    .maybeSingle();
  if (fetchError) throw new Error(`opinions 조회 실패: ${fetchError.message}`);

  // 이미 초안이 확정/제출된 의견이면(재생성을 명시적으로 요청한 게 아니라 P4를 다시 연 것뿐이라면)
  // Gemini에게 "계속할지" 다시 묻지 않는다 — 그 판단이 비결정적이라 이미 끝난 인터뷰를
  // 다시 열어버릴 수 있어서다. 확정된 대화 그대로 done=true를 돌려준다.
  if (existing && (existing.status === 'draft_confirmed' || existing.status === 'submitted')) {
    return {
      opinion_id: existing.id as string,
      done: true,
      next_question: '',
      interview: (existing.interview as InterviewTurn[] | null) ?? [],
    };
  }

  let opinionId: string;
  let stance: string;
  let interview: InterviewTurn[];

  if (existing) {
    opinionId = existing.id as string;
    stance = (existing.stance as string | null) ?? options.stance ?? '수정';
    interview = ((existing.interview as InterviewTurn[] | null) ?? []).slice();
  } else {
    stance = options.stance ?? '수정';
    const { data: created, error: insertError } = await supabaseAdmin
      .from('opinions')
      .insert({ user_id: profileId, notice_id: noticeId, stance, status: 'draft', interview: [] })
      .select('id')
      .single();
    if (insertError) throw new Error(`opinions 생성 실패: ${insertError.message}`);
    opinionId = created.id as string;
    interview = [];
  }

  // 직전 질문에 대한 답변이 왔으면(미답변 항목이 있을 때만) 완결한다.
  const lastIndex = interview.length - 1;
  const hasPending = lastIndex >= 0 && !interview[lastIndex].answer;
  if (options.answer?.trim() && hasPending) {
    interview = interview.map((t, i) => (i === lastIndex ? { ...t, answer: options.answer!.trim() } : t));
  }

  // 아직 답변을 받지 못한 질문이 남아 있으면(=이번 호출에 답변이 없었으면) Gemini를 다시 부르지 않고
  // 그 질문을 그대로 돌려준다 — 새로고침 등으로 재호출되는 경우를 대비한다.
  const stillPending = interview.length > 0 && !interview[interview.length - 1].answer;
  if (stillPending) {
    return {
      opinion_id: opinionId,
      done: false,
      next_question: interview[interview.length - 1].question,
      interview,
    };
  }

  const completedTurns = interview;

  try {
    const judgment = await judgeNextInterviewStep(
      apiKey,
      {
        billName,
        mainContent: typedNotice.main_content,
        impactText: await fetchImpactText(noticeId, profileId),
        stance,
        priorTurns: completedTurns,
      },
      model,
    );

    const nextInterview = judgment.done
      ? interview
      : [...interview, { question: judgment.next_question, answer: '' }];

    const { error: updateError } = await supabaseAdmin
      .from('opinions')
      .update({ interview: nextInterview, updated_at: new Date().toISOString() })
      .eq('id', opinionId);
    if (updateError) throw new Error(updateError.message);

    await logInterviewRun(
      noticeId,
      judgment.done
        ? `${billName} 인터뷰 종료 (${completedTurns.length}턴 완료)`
        : `${billName} 다음 질문 생성 (${completedTurns.length}턴 완료)`,
      null,
    );

    return {
      opinion_id: opinionId,
      done: judgment.done,
      next_question: judgment.done ? '' : judgment.next_question,
      interview: nextInterview,
    };
  } catch (err) {
    const reason =
      err instanceof GeminiApiError ? err.reason : err instanceof Error ? err.message : String(err);
    await logInterviewRun(noticeId, `${billName} 인터뷰 질문 생성 실패`, reason);
    throw err;
  }
}
