import { supabaseAdmin } from './supabaseAdmin.ts';
import { GeminiApiError } from './gemini.ts';
import type { GeminiModel } from './gemini.ts';
import { judgeCardImpact } from './geminiImpact.ts';
import type { ImpactVerdict, ProfileForPrompt } from './geminiImpact.ts';
import { DEMO_PERSONAS, getAllDemoProfileIds } from './demoProfiles.ts';
import type { DemoPersonaKey } from './demoProfiles.ts';
import { sleep } from './sleep.ts';
import { humanizeReason } from './humanizeError.ts';

export interface ExplainImpactOptions {
  cardId?: string;
  profileId?: string;
  model?: GeminiModel;
}

export interface ExplainImpactResult {
  processed: number;
  relevant: number;
  notRelevant: number;
  uncertain: number;
  failed: number;
  message: string;
}

interface NoticeForPrompt {
  id: string;
  bill_id: string;
  main_content: string | null;
  proposal_reason: string | null;
  raw_data: Record<string, unknown> | null;
}

interface CardForImpact {
  id: string;
  notice_id: string;
  easy_title: string | null;
  notices: NoticeForPrompt | null;
}

interface ProfileRow extends ProfileForPrompt {
  id: string;
}

// flash-lite RPM 15 기준 4.3초 페이싱 (make-card와 동일하게 재사용).
const PACING_MS: Record<GeminiModel, number> = {
  'flash-lite': 4300,
  flash: 12000,
};

const VERDICT_TO_RELEVANT: Record<ImpactVerdict, boolean | null> = {
  해당: true,
  해당없음: false,
  '확인 필요': null,
};

async function logMatchRun(message: string, reason: string | null) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'match',
    message,
    reason,
    notice_id: null,
    included: null,
  });
  if (error) console.error('agent_logs insert failed:', error.message);
}

async function fetchCompletedCards(cardId?: string): Promise<CardForImpact[]> {
  let query = supabaseAdmin
    .from('cards')
    .select('id, notice_id, easy_title, notices(id, bill_id, main_content, proposal_reason, raw_data)')
    .not('easy_title', 'is', null);
  if (cardId) query = query.eq('id', cardId);

  const { data, error } = await query;
  if (error) throw new Error(`cards 조회 실패: ${error.message}`);
  return (data ?? []) as unknown as CardForImpact[];
}

async function fetchProfile(profileId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, age_group, activities, weekly_hours, housing_type, housing_contract_plan, finance, interests')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw new Error(`profiles 조회 실패: ${error.message}`);
  return data as ProfileRow | null;
}

function personaLabelFor(profileId: string, demoIds: Record<DemoPersonaKey, string>): string {
  if (profileId === demoIds.chaewon) return DEMO_PERSONAS.chaewon.displayName;
  if (profileId === demoIds.doyoon) return DEMO_PERSONAS.doyoon.displayName;
  return '사용자';
}

/**
 * cards × profiles 조합별로 법안 원문과 프로필 조건을 대조해 실제 관련 여부를 판단하고
 * card_impacts에 upsert한다. 파라미터 없이 호출하면 완성된 카드 전체 × 데모 프로필(채원/도윤)을 처리한다.
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/explain-impact.ts와 로컬 테스트 스크립트가 공유한다.
 */
export async function runExplainImpact(
  options: ExplainImpactOptions = {},
): Promise<ExplainImpactResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았어요.');
  const model: GeminiModel = options.model ?? 'flash-lite';

  const cards = await fetchCompletedCards(options.cardId);
  if (cards.length === 0) {
    return {
      processed: 0,
      relevant: 0,
      notRelevant: 0,
      uncertain: 0,
      failed: 0,
      message: '판단할 완성 카드가 없어서 건너뜀',
    };
  }

  const demoIds = options.profileId ? null : await getAllDemoProfileIds();
  const profileIdsPerCard: string[] = options.profileId
    ? [options.profileId]
    : [demoIds!.chaewon, demoIds!.doyoon];

  let processed = 0;
  let relevant = 0;
  let notRelevant = 0;
  let uncertain = 0;
  let failed = 0;
  let isFirstCall = true;

  for (const card of cards) {
    const notice = card.notices;
    const billName = (notice?.raw_data?.BILL_NAME as string | undefined) ?? notice?.bill_id ?? '(제목 없음)';
    const verdictsForLog: string[] = [];

    for (const profileId of profileIdsPerCard) {
      const label = demoIds ? personaLabelFor(profileId, demoIds) : '사용자';

      if (!notice || !notice.main_content) {
        failed += 1;
        verdictsForLog.push(`${label}: 실패(본문 없음)`);
        continue;
      }

      const profile = await fetchProfile(profileId);
      if (!profile) {
        failed += 1;
        verdictsForLog.push(`${label}: 실패(프로필 없음)`);
        continue;
      }

      if (!isFirstCall) await sleep(PACING_MS[model]);
      isFirstCall = false;

      try {
        const judgment = await judgeCardImpact(apiKey, {
          billName,
          mainContent: notice.main_content,
          proposalReason: notice.proposal_reason,
          profile,
        }, model);

        const isRelevant = VERDICT_TO_RELEVANT[judgment.verdict];
        const { error: upsertError } = await supabaseAdmin.from('card_impacts').upsert(
          {
            card_id: card.id,
            profile_id: profileId,
            is_relevant: isRelevant,
            impact_text: judgment.impact_text,
            calculation_basis: judgment.calculation_basis,
          },
          { onConflict: 'card_id,profile_id' },
        );
        if (upsertError) throw new Error(upsertError.message);

        processed += 1;
        if (isRelevant === true) relevant += 1;
        else if (isRelevant === false) notRelevant += 1;
        else uncertain += 1;
        verdictsForLog.push(`${label}: ${judgment.verdict}`);
      } catch (err) {
        failed += 1;
        const rawReason =
          err instanceof GeminiApiError ? err.reason : err instanceof Error ? err.message : String(err);
        console.error(`explain-impact failed (${billName}, ${label}):`, rawReason);
        verdictsForLog.push(`${label}: 실패`);
        await logMatchRun(`${billName} → ${label}: 판단 실패`, humanizeReason(rawReason));
      }
    }

    await logMatchRun(`${card.easy_title ?? billName} → ${verdictsForLog.join(' / ')}`, null);
  }

  const message = `카드 ${cards.length}건 × 프로필 ${profileIdsPerCard.length}명 처리 → 해당 ${relevant}건 / 해당없음 ${notRelevant}건 / 확인 필요 ${uncertain}건 / 실패 ${failed}건`;

  return { processed, relevant, notRelevant, uncertain, failed, message };
}
