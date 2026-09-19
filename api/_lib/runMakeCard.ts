import { supabaseAdmin } from './supabaseAdmin.ts';
import { GeminiApiError, judgeAndDraftCard } from './gemini.ts';
import type { GeminiModel } from './gemini.ts';
import { sleep } from './sleep.ts';

// Google AI Studio 실측 RPM(flash-lite 15 / flash 5)에 맞춘 호출 간격.
// flash-lite는 60÷15=4초 경계에 딱 붙지 않도록 여유를 두고, flash는 60÷5=12초를 그대로 강제한다.
const PACING_MS: Record<GeminiModel, number> = {
  'flash-lite': 4300,
  flash: 12000,
};

// Gemini가 responseSchema의 minItems를 지키지 않고 cons를 비우거나 pros보다 적게 주는 경우가
// 실측상 흔해서, SP-2(기대/우려 같은 개수)를 프롬프트에만 맡기지 않고 코드로 보장한다.
// 이 법안 고유의 사실을 지어내는 대신, 정책 변경에 일반적으로 따라오는 안전한 문구로 채운다.
const GENERIC_CONCERNS = [
  '제도 시행 초기에는 안내와 절차가 충분하지 않아 실제 체감까지 시간이 걸릴 수 있어요.',
  '지원·적용 대상 기준에 따라 비슷한 상황이어도 제외되는 사람이 생길 수 있어요.',
  '시행에 필요한 재원이나 행정 비용 부담이 늘어날 수 있다는 우려가 있어요.',
];

function balanceCons(pros: string[], cons: string[]): string[] {
  if (cons.length >= pros.length) return cons.slice(0, pros.length);
  const filler = GENERIC_CONCERNS.filter((c) => !cons.includes(c));
  const padded = [...cons];
  let i = 0;
  while (padded.length < pros.length) {
    padded.push(filler[i % filler.length]);
    i += 1;
  }
  return padded;
}

export interface MakeCardResult {
  totalCandidates: number;
  processed: number;
  relevant: number;
  excluded: number;
  failed: number;
  message: string;
}

interface PendingCard {
  id: string;
  notice_id: string;
}

interface NoticeForCard {
  id: string;
  bill_id: string;
  main_content: string | null;
  proposal_reason: string | null;
  raw_data: Record<string, unknown> | null;
}

async function logAnalyzeRun(
  noticeId: string,
  message: string,
  reason: string | null,
  included: boolean | null,
) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'analyze',
    notice_id: noticeId,
    message,
    reason,
    included,
  });
  // 로그 기록 자체가 실패해도 처리 결과 응답은 막지 않는다 (콘솔에만 남긴다).
  if (error) console.error('agent_logs insert failed:', error.message);
}

export interface RunMakeCardOptions {
  /** 기본 flash-lite(RPM 15). flash(RPM 5)는 시연용 소수 카드 처리 전용 — limit과 함께 쓰는 걸 권장. */
  model?: GeminiModel;
  /** 지정하면 대기 카드 중 앞에서부터 이 개수만 처리한다. */
  limit?: number;
}

/**
 * score-relevance(법령명 기준)로 선별된 cards 중 아직 easy_title이 없는 건을 Gemini에게 보여주고,
 * 윤채원(17세)/강도윤(25세) 두 페르소나 기준 실제 관련성을 최종 판단시킨다.
 * 관련 있으면 카드를 완성하고, 관련 없으면 cards에서 삭제한다.
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/make-card.ts와 로컬 테스트 스크립트가 공유한다.
 */
export async function runMakeCard(options: RunMakeCardOptions = {}): Promise<MakeCardResult> {
  const model: GeminiModel = options.model ?? 'flash-lite';
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았어요.');
  }

  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('id, notice_id')
    .is('easy_title', null);
  if (cardsError) throw new Error(`cards 조회 실패: ${cardsError.message}`);

  const allPending = (cards ?? []) as PendingCard[];
  const pendingCards =
    typeof options.limit === 'number' ? allPending.slice(0, options.limit) : allPending;
  if (pendingCards.length === 0) {
    return {
      totalCandidates: allPending.length,
      processed: 0,
      relevant: 0,
      excluded: 0,
      failed: 0,
      message:
        allPending.length === 0
          ? '판단 대기 중인 카드가 없어서 건너뜀'
          : 'limit=0이라 처리할 카드가 없어서 건너뜀',
    };
  }

  const noticeIds = [...new Set(pendingCards.map((c) => c.notice_id))];
  const { data: notices, error: noticesError } = await supabaseAdmin
    .from('notices')
    .select('id, bill_id, main_content, proposal_reason, raw_data')
    .in('id', noticeIds);
  if (noticesError) throw new Error(`notices 조회 실패: ${noticesError.message}`);

  const noticeById = new Map(((notices ?? []) as NoticeForCard[]).map((n) => [n.id, n]));

  let relevant = 0;
  let excluded = 0;
  let failed = 0;
  let isFirstCall = true;

  for (const card of pendingCards) {
    const notice = noticeById.get(card.notice_id);
    const billName =
      (notice?.raw_data?.BILL_NAME as string | undefined) ?? notice?.bill_id ?? '(제목 없음)';

    if (!notice || !notice.main_content) {
      failed += 1;
      await logAnalyzeRun(
        card.notice_id,
        `${billName} → 본문 없음, 건너뜀`,
        '제안이유·주요내용이 아직 수집되지 않음',
        null,
      );
      continue;
    }

    // 실제 RPM 한도(429)를 피하기 위해 호출 사이에 간격을 둔다 (재시도가 아니라 페이싱).
    if (!isFirstCall) await sleep(PACING_MS[model]);
    isFirstCall = false;

    try {
      const judgment = await judgeAndDraftCard(
        apiKey,
        {
          billName,
          mainContent: notice.main_content,
          proposalReason: notice.proposal_reason,
        },
        model,
      );

      if (judgment.is_relevant) {
        const pros = judgment.pros ?? [];
        const cons = balanceCons(pros, judgment.cons ?? []);

        const { error: updateError } = await supabaseAdmin
          .from('cards')
          .update({
            // 법령명 기준 1차 점수(0.3)보다 신뢰도 높게: Gemini가 본문을 읽고 확정한 결과이므로
            // 0.7~0.95 구간의 고정값을 사용한다(Gemini 응답에 별도 신뢰도 필드는 없음).
            relevance_score: 0.85,
            relevance_reason: judgment.reason,
            easy_title: judgment.easy_title ?? null,
            one_line: judgment.one_line ?? null,
            pros,
            cons,
          })
          .eq('id', card.id);
        if (updateError) throw new Error(updateError.message);

        relevant += 1;
        await logAnalyzeRun(
          card.notice_id,
          `${judgment.easy_title ?? billName} 카드 생성 완료`,
          judgment.reason,
          true,
        );
      } else {
        const { error: deleteError } = await supabaseAdmin.from('cards').delete().eq('id', card.id);
        if (deleteError) throw new Error(deleteError.message);

        excluded += 1;
        await logAnalyzeRun(card.notice_id, `${billName} → 최종 제외`, judgment.reason, false);
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof GeminiApiError ? err.message : '[분석] 실패 · 응답 없음';
      const reason =
        err instanceof GeminiApiError
          ? err.reason
          : err instanceof Error
            ? err.message
            : String(err);
      // 재시도 없이 바로 다음 카드로 넘어간다.
      await logAnalyzeRun(card.notice_id, `${billName} → ${message}`, reason, null);
    }
  }

  const message =
    `대기 카드 ${allPending.length}건 중 ${pendingCards.length}건 처리(모델: ${model}) → ` +
    `관련 ${relevant}건 / 제외 ${excluded}건 / 실패 ${failed}건`;

  return {
    totalCandidates: allPending.length,
    processed: pendingCards.length,
    relevant,
    excluded,
    failed,
    message,
  };
}
