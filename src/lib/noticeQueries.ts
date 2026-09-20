// notices/cards/card_impacts 실제 Supabase 조회. mockData.ts의 시드 데이터를 대체한다.

import { supabase } from './supabase';
import type { Card, CardImpact, Notice, NoticeCard, NoticeDetail } from '../types/database';

type CardWithNotice = Card & { notices: Notice | null };
type ImpactWithCard = CardImpact & { cards: CardWithNotice | null };

function toNoticeCardFromImpact(row: ImpactWithCard): NoticeCard | null {
  if (!row.cards || !row.cards.notices) return null;
  const { notices: notice, ...card } = row.cards;
  const impact: CardImpact = {
    id: row.id,
    card_id: row.card_id,
    profile_id: row.profile_id,
    is_relevant: row.is_relevant,
    impact_text: row.impact_text,
    calculation_basis: row.calculation_basis,
    created_at: row.created_at,
  };
  return { notice, card, impact };
}

/**
 * 현재 프로필 기준으로 explain-impact가 "해당(is_relevant=true)"으로 확정한 카드만 가져온다.
 * profileId가 없으면(아직 프로필 미선택) 개인화할 수 없으니 빈 배열을 돌려준다.
 */
export async function fetchRelatedNoticeCards(profileId: string | null): Promise<NoticeCard[]> {
  if (!profileId) return [];

  const { data, error } = await supabase
    .from('card_impacts')
    .select(
      'id, card_id, profile_id, is_relevant, impact_text, calculation_basis, created_at, cards(id, notice_id, category, relevance_score, relevance_reason, easy_title, one_line, before_text, after_text, pros, cons, created_at, notices(*))',
    )
    .eq('profile_id', profileId)
    .eq('is_relevant', true)
    .order('relevance_score', { foreignTable: 'cards', ascending: false });

  if (error) throw new Error(`card_impacts 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as ImpactWithCard[])
    .map(toNoticeCardFromImpact)
    .filter((v): v is NoticeCard => v !== null);
}

export const OTHER_NOTICES_INITIAL_LIMIT = 6;
export const OTHER_NOTICES_PAGE_SIZE = 20;

export interface OtherNoticesResult {
  notices: Notice[];
  totalCount: number;
}

/**
 * 현재 프로필에게 "해당"으로 확정되지 않은(아직 판단 전 · 확인 필요 · 해당없음 · 카드 자체가 없는)
 * 입법예고 — "관련성이 낮아 걸러진 법안" 목록용. offset부터 limit개를 notice_end 순으로 가져온다
 * ("더 보기" 페이지네이션용 — offset을 올려가며 이어서 호출한다).
 */
export async function fetchOtherNotices(
  excludeNoticeIds: string[],
  offset = 0,
  limit = OTHER_NOTICES_INITIAL_LIMIT,
): Promise<OtherNoticesResult> {
  let query = supabase
    .from('notices')
    .select('*', { count: 'exact' })
    .order('notice_end', { ascending: true })
    .range(offset, offset + limit - 1);
  if (excludeNoticeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeNoticeIds.join(',')})`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`notices 조회 실패: ${error.message}`);
  return { notices: (data ?? []) as Notice[], totalCount: count ?? 0 };
}

/**
 * notice_id 하나로 notices+cards를 가져오고, profileId가 있으면 그 프로필의 card_impacts도 붙인다
 * (P3 상세 화면용 — "나의 경우" 섹션은 impact_text/calculation_basis를 쓴다).
 */
export async function fetchNoticeCardById(
  noticeId: string,
  profileId: string | null,
): Promise<NoticeCard | null> {
  const { data: notice, error: noticeError } = await supabase
    .from('notices')
    .select('*')
    .eq('id', noticeId)
    .maybeSingle();
  if (noticeError) throw new Error(`notices 조회 실패: ${noticeError.message}`);
  if (!notice) return null;

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .eq('notice_id', noticeId)
    .not('easy_title', 'is', null)
    .maybeSingle();
  if (cardError) throw new Error(`cards 조회 실패: ${cardError.message}`);
  if (!card) return null;

  let impact: CardImpact | null = null;
  if (profileId) {
    const { data: impactRow, error: impactError } = await supabase
      .from('card_impacts')
      .select('*')
      .eq('card_id', card.id)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (impactError) throw new Error(`card_impacts 조회 실패: ${impactError.message}`);
    impact = impactRow as CardImpact | null;
  }

  return { notice: notice as Notice, card: card as Card, impact };
}

/**
 * notice_id 하나로 notices를 가져오고, cards/card_impacts는 있으면 붙인다(P3 상세 화면용).
 * fetchNoticeCardById와 달리 카드가 없어도(아직 explain-impact 전) null을 반환하지 않고
 * "기본 정보 모드"로 표시할 수 있게 card: null인 채로 돌려준다. 카드 필수인 P4(useOpinionDraft)는
 * 계속 fetchNoticeCardById를 쓴다.
 */
export async function fetchNoticeDetail(
  noticeId: string,
  profileId: string | null,
): Promise<NoticeDetail | null> {
  const { data: notice, error: noticeError } = await supabase
    .from('notices')
    .select('*')
    .eq('id', noticeId)
    .maybeSingle();
  if (noticeError) throw new Error(`notices 조회 실패: ${noticeError.message}`);
  if (!notice) return null;

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .eq('notice_id', noticeId)
    .not('easy_title', 'is', null)
    .maybeSingle();
  if (cardError) throw new Error(`cards 조회 실패: ${cardError.message}`);

  let impact: CardImpact | null = null;
  if (card && profileId) {
    const { data: impactRow, error: impactError } = await supabase
      .from('card_impacts')
      .select('*')
      .eq('card_id', card.id)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (impactError) throw new Error(`card_impacts 조회 실패: ${impactError.message}`);
    impact = impactRow as CardImpact | null;
  }

  return { notice: notice as Notice, card: card as Card | null, impact };
}
