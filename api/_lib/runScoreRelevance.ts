import { supabaseAdmin } from './supabaseAdmin.ts';
import { matchCategory, scoreFromMatchCount } from './relevanceKeywords.ts';

export interface ScoreRelevanceResult {
  evaluated: number;
  matched: number;
  excluded: number;
  byCategory: Record<string, number>;
  message: string;
}

interface PendingNotice {
  id: string;
  raw_data: Record<string, unknown> | null;
}

interface CardInsert {
  notice_id: string;
  category: string;
  relevance_score: number;
  relevance_reason: string;
}

interface AgentLogInsert {
  step: string;
  notice_id: string;
  message: string;
  reason: string;
  included: boolean;
}

/**
 * notices 중 아직 cards가 없는 건을 법령명 기준으로 1차 필터링해 cards/agent_logs에 기록한다.
 * 내용을 판단하는 단계가 아니라 카테고리 후보를 추리는 단계 — 실제 관련성은
 * get-notice-detail로 본문을 받아온 뒤 make-card(LLM) 단계에서 확정한다.
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/score-relevance.ts와 로컬 테스트 스크립트가 공유한다.
 */
export async function runScoreRelevance(): Promise<ScoreRelevanceResult> {
  const { data: existingCards, error: cardsFetchError } = await supabaseAdmin
    .from('cards')
    .select('notice_id');
  if (cardsFetchError) {
    throw new Error(`cards 조회 실패: ${cardsFetchError.message}`);
  }

  const evaluatedIds = new Set((existingCards ?? []).map((c) => c.notice_id as string));

  const { data: notices, error: noticesFetchError } = await supabaseAdmin
    .from('notices')
    .select('id, raw_data');
  if (noticesFetchError) {
    throw new Error(`notices 조회 실패: ${noticesFetchError.message}`);
  }

  const pending = ((notices ?? []) as PendingNotice[]).filter((n) => !evaluatedIds.has(n.id));

  const cardRows: CardInsert[] = [];
  const logRows: AgentLogInsert[] = [];
  const byCategory: Record<string, number> = {};

  for (const notice of pending) {
    const billName = (notice.raw_data?.BILL_NAME as string | undefined) ?? '(제목 없음)';
    const match = matchCategory(billName);

    if (match) {
      const relevanceScore = scoreFromMatchCount(match.matchedLawNames.length);
      cardRows.push({
        notice_id: notice.id,
        category: match.category,
        relevance_score: relevanceScore,
        relevance_reason: '법령명 기준 후보로 선정, 내용 미확인',
      });
      logRows.push({
        step: 'filter',
        notice_id: notice.id,
        message: `${billName} → ${match.category} · 관련도 높음`,
        reason: `${match.matchedLawNames.join(', ')}가 적용 대상 포함`,
        included: true,
      });
      byCategory[match.category] = (byCategory[match.category] ?? 0) + 1;
    } else {
      logRows.push({
        step: 'filter',
        notice_id: notice.id,
        message: `${billName} → 제외`,
        reason: '관련 법령명 없음',
        included: false,
      });
    }
  }

  if (cardRows.length > 0) {
    const { error: cardsInsertError } = await supabaseAdmin.from('cards').insert(cardRows);
    if (cardsInsertError) {
      throw new Error(`cards 저장 실패: ${cardsInsertError.message}`);
    }
  }

  if (logRows.length > 0) {
    const { error: logsInsertError } = await supabaseAdmin.from('agent_logs').insert(logRows);
    if (logsInsertError) {
      throw new Error(`agent_logs 저장 실패: ${logsInsertError.message}`);
    }
  }

  const matched = cardRows.length;
  const excluded = pending.length - matched;
  const message = `${pending.length}건 평가 · ${matched}건 선별, ${excluded}건 제외`;

  return { evaluated: pending.length, matched, excluded, byCategory, message };
}
