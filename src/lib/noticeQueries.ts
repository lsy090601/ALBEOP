// notices/cards 실제 Supabase 조회. mockData.ts의 시드 데이터를 대체한다.
//
// TODO(explain-impact): cards에는 아직 "이 카드가 어느 프로필과 관련 있는지"를 저장하는
// 필드가 없다. 지금은 make-card가 만든 카드(easy_title이 채워진 것)가 있으면
// 현재 선택된 프로필이 누구든 동일하게 "관련 있음"으로 보여준다. 프로필별로 다르게
// 보여주는 정교한 매칭은 다음 단계 explain-impact에서 만든다.

import { supabase } from './supabase';
import type { Card, Notice, NoticeCard } from '../types/database';

type CardWithNotice = Card & { notices: Notice | null };

function toNoticeCard(row: CardWithNotice): NoticeCard | null {
  if (!row.notices) return null;
  const { notices: notice, ...card } = row;
  return { notice, card };
}

/** make-card가 관련 있다고 확정한(easy_title이 채워진) 카드 전체를 관련성 순으로 가져온다. */
export async function fetchRelatedNoticeCards(): Promise<NoticeCard[]> {
  const { data, error } = await supabase
    .from('cards')
    .select(
      'id, notice_id, category, relevance_score, relevance_reason, easy_title, one_line, before_text, after_text, pros, cons, created_at, notices(*)',
    )
    .not('easy_title', 'is', null)
    .order('relevance_score', { ascending: false });

  if (error) throw new Error(`cards 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as CardWithNotice[])
    .map(toNoticeCard)
    .filter((v): v is NoticeCard => v !== null);
}

const OTHER_NOTICES_LIMIT = 6;

export interface OtherNoticesResult {
  notices: Notice[];
  totalCount: number;
}

/**
 * 완성된 카드가 없는(아직 판단 전이거나 제외된) 입법예고 — "관련성이 낮아 걸러진 법안" 목록용.
 * 실제 수집 건수가 수백 건일 수 있어 화면에는 상위 일부만 보여주고 전체 건수는 따로 반환한다.
 */
export async function fetchOtherNotices(excludeNoticeIds: string[]): Promise<OtherNoticesResult> {
  let query = supabase
    .from('notices')
    .select('*', { count: 'exact' })
    .order('notice_end', { ascending: true })
    .limit(OTHER_NOTICES_LIMIT);
  if (excludeNoticeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeNoticeIds.join(',')})`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`notices 조회 실패: ${error.message}`);
  return { notices: (data ?? []) as Notice[], totalCount: count ?? 0 };
}

/** notice_id 하나로 notices+cards 조인 결과를 가져온다 (P3 상세 화면용). */
export async function fetchNoticeCardById(noticeId: string): Promise<NoticeCard | null> {
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

  return { notice: notice as Notice, card: card as Card };
}
