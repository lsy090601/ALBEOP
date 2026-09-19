import { supabaseAdmin } from './supabaseAdmin.ts';
import type { Card, Notice, Opinion } from './trackingTypes.ts';

export interface OpinionEntry {
  opinion: Opinion;
  noticeCard: { notice: Notice; card: Card } | null;
}

/**
 * opinion_id 하나로 의견 + 연결된 notice/card를 조회한다(P5 제출 안내용).
 * opinions는 RLS(auth.uid()=user_id)로 anon 조회가 막혀 있어 서비스 롤로 대신 읽어준다.
 */
export async function runFetchOpinion(opinionId: string): Promise<OpinionEntry | null> {
  const { data: opinion, error: opinionError } = await supabaseAdmin
    .from('opinions')
    .select('*')
    .eq('id', opinionId)
    .maybeSingle();
  if (opinionError) throw new Error(`opinions 조회 실패: ${opinionError.message}`);
  if (!opinion) return null;

  const { data: notice, error: noticeError } = await supabaseAdmin
    .from('notices')
    .select('*')
    .eq('id', (opinion as Opinion).notice_id)
    .maybeSingle();
  if (noticeError) throw new Error(`notices 조회 실패: ${noticeError.message}`);

  const { data: card, error: cardError } = await supabaseAdmin
    .from('cards')
    .select('*')
    .eq('notice_id', (opinion as Opinion).notice_id)
    .maybeSingle();
  if (cardError) throw new Error(`cards 조회 실패: ${cardError.message}`);

  return {
    opinion: opinion as Opinion,
    noticeCard: notice && card ? { notice: notice as Notice, card: card as Card } : null,
  };
}
