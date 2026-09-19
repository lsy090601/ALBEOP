import { supabaseAdmin } from './supabaseAdmin.ts';
import type { Card, Notice, Opinion } from './trackingTypes.ts';

export interface VoiceEntry {
  opinion: Opinion;
  noticeCard: { notice: Notice; card: Card } | null;
}

/**
 * 특정 프로필의 "내 목소리"(P6) 목록을 real Supabase에서 조회한다.
 * opinions는 RLS(auth.uid()=user_id)로 anon 조회가 막혀 있어 서비스 롤로 대신 읽어준다.
 * 제출된 의견은 항상 보여주고, 초안끼리는 notice_id당 최신 1건으로 줄인다(기존 mock 로직과 동일).
 */
export async function runMyVoice(profileId: string): Promise<VoiceEntry[]> {
  const { data: opinions, error: opinionsError } = await supabaseAdmin
    .from('opinions')
    .select('*')
    .eq('user_id', profileId)
    .in('status', ['draft_confirmed', 'submitted'])
    .order('updated_at', { ascending: false });
  if (opinionsError) throw new Error(`opinions 조회 실패: ${opinionsError.message}`);

  const all = (opinions ?? []) as Opinion[];
  const submitted = all.filter((o) => o.status === 'submitted');
  const latestDraftByNotice = new Map<string, Opinion>();
  for (const opinion of all) {
    if (opinion.status === 'submitted') continue;
    if (!latestDraftByNotice.has(opinion.notice_id)) latestDraftByNotice.set(opinion.notice_id, opinion);
  }
  const target = [...submitted, ...latestDraftByNotice.values()];
  if (target.length === 0) return [];

  const noticeIds = [...new Set(target.map((o) => o.notice_id))];
  const { data: notices, error: noticesError } = await supabaseAdmin
    .from('notices')
    .select('*')
    .in('id', noticeIds);
  if (noticesError) throw new Error(`notices 조회 실패: ${noticesError.message}`);
  const noticeMap = new Map(((notices ?? []) as Notice[]).map((n) => [n.id, n]));

  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('*')
    .in('notice_id', noticeIds);
  if (cardsError) throw new Error(`cards 조회 실패: ${cardsError.message}`);
  const cardMap = new Map(((cards ?? []) as Card[]).map((c) => [c.notice_id, c]));

  return target.map((opinion) => {
    const notice = noticeMap.get(opinion.notice_id);
    const card = cardMap.get(opinion.notice_id);
    return {
      opinion,
      noticeCard: notice && card ? { notice, card } : null,
    };
  });
}
