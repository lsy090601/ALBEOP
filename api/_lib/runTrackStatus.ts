import { supabaseAdmin } from './supabaseAdmin.ts';
import {
  BillTrackingApiError,
  describeResult,
  fetchBillTracking,
  mapToTrackingStatus,
} from './billTracking.ts';

export interface TrackStatusOptions {
  /** 특정 opinion 하나만 추적하고 싶을 때(테스트용). 없으면 대상 전체를 처리한다. */
  opinionId?: string;
}

export interface TrackStatusResult {
  processed: number;
  changed: number;
  unchanged: number;
  skipped: number;
  failed: number;
  message: string;
}

interface OpinionForTracking {
  id: string;
  user_id: string;
  notice_id: string;
  last_tracking_status: string | null;
}

interface NoticeForTracking {
  id: string;
  bill_id: string;
  raw_data: Record<string, unknown> | null;
}

interface CardForTracking {
  notice_id: string;
  easy_title: string | null;
}

async function logTrackRun(noticeId: string | null, message: string, reason: string | null) {
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    step: 'track',
    notice_id: noticeId,
    message,
    reason,
    included: null,
  });
  if (error) console.error('agent_logs insert failed:', error.message);
}

async function fetchTrackedOpinions(opinionId?: string): Promise<OpinionForTracking[]> {
  let query = supabaseAdmin
    .from('opinions')
    .select('id, user_id, notice_id, last_tracking_status')
    .in('status', ['draft_confirmed', 'submitted']);
  if (opinionId) query = query.eq('id', opinionId);

  const { data, error } = await query;
  if (error) throw new Error(`opinions 조회 실패: ${error.message}`);
  return (data ?? []) as OpinionForTracking[];
}

/**
 * draft_confirmed/submitted 상태인 의견들의 연결된 법안을 열린국회정보 "의안정보 통합
 * API(ALLBILLV2)"로 조회해 처리단계가 바뀌었으면 opinions.last_tracking_status를 갱신하고
 * notifications를 생성한다. 판단이 필요 없는 순수 데이터 조회라 Gemini는 쓰지 않는다.
 * HTTP 관련 처리는 하지 않는 순수 함수 — /api/track-status.ts가 이를 감싼다.
 */
export async function runTrackStatus(
  options: TrackStatusOptions = {},
): Promise<TrackStatusResult> {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLY_API_KEY가 설정되지 않았어요.');

  const opinions = await fetchTrackedOpinions(options.opinionId);
  if (opinions.length === 0) {
    return {
      processed: 0,
      changed: 0,
      unchanged: 0,
      skipped: 0,
      failed: 0,
      message: '추적 대상 의견이 없어서 건너뜀',
    };
  }

  const noticeIds = [...new Set(opinions.map((o) => o.notice_id))];
  const { data: notices, error: noticesError } = await supabaseAdmin
    .from('notices')
    .select('id, bill_id, raw_data')
    .in('id', noticeIds);
  if (noticesError) throw new Error(`notices 조회 실패: ${noticesError.message}`);
  const noticeMap = new Map(
    ((notices ?? []) as NoticeForTracking[]).map((n) => [n.id, n]),
  );

  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('notice_id, easy_title')
    .in('notice_id', noticeIds);
  if (cardsError) throw new Error(`cards 조회 실패: ${cardsError.message}`);
  const cardMap = new Map(
    ((cards ?? []) as CardForTracking[]).map((c) => [c.notice_id, c]),
  );

  let changed = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  for (const opinion of opinions) {
    const notice = noticeMap.get(opinion.notice_id);
    const easyTitle = cardMap.get(opinion.notice_id)?.easy_title ?? '법안';

    if (!notice?.bill_id) {
      skipped += 1;
      continue;
    }

    const age = (notice.raw_data?.AGE as string | undefined) ?? '22';
    const eraco = `제${age}대`;

    try {
      const row = await fetchBillTracking(apiKey, { billNo: notice.bill_id, eraco });
      if (!row) {
        // 아직 의안정보시스템에 등록되지 않음 — 실패가 아니라 이전 상태를 유지하는 정상 케이스.
        unchanged += 1;
        continue;
      }

      const newStatus = mapToTrackingStatus(row);
      if (newStatus === opinion.last_tracking_status) {
        unchanged += 1;
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('opinions')
        .update({ last_tracking_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', opinion.id);
      if (updateError) throw new Error(updateError.message);

      const resultDetail = newStatus === '결과' ? describeResult(row) : null;
      const stageLabel = resultDetail ? `결과(${resultDetail})` : newStatus;
      const message = `${easyTitle} 법안이 ${stageLabel} 단계로 넘어갔어요`;

      const { error: notifError } = await supabaseAdmin.from('notifications').insert({
        user_id: opinion.user_id,
        type: 'progress',
        message,
        related_notice_id: opinion.notice_id,
        related_opinion_id: opinion.id,
        is_read: false,
      });
      if (notifError) console.error('notifications insert failed:', notifError.message);

      await logTrackRun(opinion.notice_id, message, null);
      changed += 1;
    } catch (err) {
      failed += 1;
      const reason =
        err instanceof BillTrackingApiError
          ? err.reason
          : err instanceof Error
            ? err.message
            : String(err);
      await logTrackRun(opinion.notice_id, `${easyTitle} 처리단계 조회 실패`, reason);
    }
  }

  const message = `추적 대상 ${opinions.length}건 → 변경 ${changed}건 / 변경없음 ${unchanged}건 / 건너뜀 ${skipped}건 / 실패 ${failed}건`;

  return { processed: opinions.length, changed, unchanged, skipped, failed, message };
}

// src/lib/mockData.ts의 TRACKING_STEPS와 반드시 같은 5개 문자열을 유지해야 한다.
const TRACKING_STEPS = ['입법예고 종료', '위원회 심사', '법사위 심사', '본회의', '결과'] as const;

export interface DemoAdvanceResult {
  advanced: boolean;
  opinionId: string | null;
  newStatus: string | null;
  message: string;
}

/**
 * 데모 패널 "시간경과(위원회심사)" 버튼 전용. 실제 ALLBILLV2 호출 없이 해당 프로필의
 * 진행 중인 의견 하나를 다음 단계로 강제 이동시킨다(실제 API가 그 타이밍에 아직 안 바뀌어
 * 있을 수 있어 시연용으로 별도 유지). 진짜 에이전트 실행이 아니므로 agent_logs에는 남기지 않는다.
 */
export async function runDemoAdvanceTracking(profileId: string): Promise<DemoAdvanceResult> {
  const { data: opinions, error } = await supabaseAdmin
    .from('opinions')
    .select('id, notice_id, last_tracking_status')
    .eq('user_id', profileId)
    .in('status', ['draft_confirmed', 'submitted'])
    .order('created_at', { ascending: true });
  if (error) throw new Error(`opinions 조회 실패: ${error.message}`);

  type Step = (typeof TRACKING_STEPS)[number];
  const target = (opinions ?? []).find((o) => {
    const idx = TRACKING_STEPS.indexOf((o.last_tracking_status ?? '') as Step);
    return idx < TRACKING_STEPS.length - 1;
  });

  if (!target) {
    return { advanced: false, opinionId: null, newStatus: null, message: '진행시킬 의견이 없어요' };
  }

  const currentIdx = TRACKING_STEPS.indexOf((target.last_tracking_status ?? '') as Step);
  const nextStatus = TRACKING_STEPS[currentIdx + 1];

  const { error: updateError } = await supabaseAdmin
    .from('opinions')
    .update({ last_tracking_status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', target.id);
  if (updateError) throw new Error(updateError.message);

  const { data: card } = await supabaseAdmin
    .from('cards')
    .select('easy_title')
    .eq('notice_id', target.notice_id)
    .maybeSingle();
  const easyTitle = card?.easy_title ?? '내 법안';

  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: profileId,
    type: 'progress',
    message: `"${easyTitle}" 법안이 ${nextStatus} 단계로 이동했어요`,
    related_notice_id: target.notice_id,
    related_opinion_id: target.id,
    is_read: false,
  });
  if (notifError) console.error('notifications insert failed:', notifError.message);

  return {
    advanced: true,
    opinionId: target.id,
    newStatus: nextStatus,
    message: `${easyTitle} → ${nextStatus}`,
  };
}
