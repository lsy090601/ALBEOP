// 가변 데모 상태(opinions/notifications/agent_logs)와 데모 패널 액션을 관리하는 외부 스토어.
// 정적 시드 데이터(프로필/입법예고/카드)는 mockData.ts를 참조한다.
// 실제 서비스 연동 시 이 파일의 조회/액션 함수 내부만 Supabase 쿼리로 교체하면 된다.

import {
  CHAEWON_ID,
  DOYOON_ID,
  NOTICE_JUHYU_ID,
  NOTICE_WOLSE_ID,
  NOTICE_YOUTH_CONTRACT_ID,
  TRACKING_STEPS,
  getRelatedNoticeCards,
  getTrackingStepIndex,
  seedCards,
} from './mockData';
import type { AgentLog, AppNotification, Opinion } from '../types/database';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ---------- 시드: opinions / notifications / agent_logs ----------

const seedOpinions: Opinion[] = [
  {
    id: 'opinion-chaewon-1',
    user_id: CHAEWON_ID,
    notice_id: NOTICE_JUHYU_ID,
    stance: '수정',
    status: 'submitted',
    interview: [
      {
        question: '지금 이 법안과 관련된 상황에 계신가요?',
        answer: '카페에서 주 15시간 아르바이트를 하고 있어요.',
      },
      {
        question: '이 변화가 생기면 가장 먼저 어떤 점이 걱정되나요?',
        answer: '시간이 더 적은 친구들은 여전히 제외될까봐 걱정돼요.',
      },
    ],
    draft_text:
      '주 10시간 기준 완화에 찬성하지만, 단시간 알바생 보호를 위해 사업장 합산 기준도 함께 검토해 주시기 바랍니다.',
    summary: {
      title: '단시간 근로자 주휴수당 기준, 합산 기준 검토 요청',
      situation: '카페에서 주 15시간 아르바이트 중',
      concern: '시간이 더 짧은 친구들은 여전히 제외될 수 있음',
      suggestion: '사업장 합산 기준도 함께 검토 요청',
    },
    submitted: true,
    last_tracking_status: '위원회 심사',
    created_at: daysAgoIso(3),
    updated_at: daysAgoIso(3),
  },
  {
    id: 'opinion-doyoon-1',
    user_id: DOYOON_ID,
    notice_id: NOTICE_WOLSE_ID,
    stance: '찬성',
    status: 'submitted',
    interview: [
      {
        question: '지금 이 법안과 관련된 상황에 계신가요?',
        answer: '월세로 거주 중이고 보증금 반환이 걱정돼요.',
      },
    ],
    draft_text: '보증금 반환 보증 지원 확대에 찬성합니다. 조속한 시행을 부탁드립니다.',
    summary: {
      title: '청년 월세 보증금 반환 보증 지원 확대 찬성',
      situation: '월세 거주 중이며 보증금 반환 위험에 대한 안전장치가 부족하다고 느낌',
      suggestion: '지원 대상 확대를 조속히 시행해 주시기 바랍니다.',
    },
    submitted: true,
    last_tracking_status: '본회의',
    created_at: daysAgoIso(7),
    updated_at: daysAgoIso(7),
  },
];

const seedNotifications: AppNotification[] = [
  {
    id: 'notif-chaewon-1',
    user_id: CHAEWON_ID,
    type: 'progress',
    message: '"단시간 근로자 주휴수당 기준이 바뀔 수 있어요" 법안이 위원회 심사 단계로 이동했어요.',
    related_notice_id: NOTICE_JUHYU_ID,
    related_opinion_id: 'opinion-chaewon-1',
    is_read: false,
    created_at: daysAgoIso(3),
  },
  {
    id: 'notif-doyoon-1',
    user_id: DOYOON_ID,
    type: 'progress',
    message: '"청년 월세 보증금 반환 지원이 넓어져요" 법안이 본회의 부의 예정이에요.',
    related_notice_id: NOTICE_WOLSE_ID,
    related_opinion_id: 'opinion-doyoon-1',
    is_read: true,
    created_at: daysAgoIso(7),
  },
];

const seedAgentLogs: AgentLog[] = [
  {
    id: 'log-1',
    run_at: daysAgoIso(0),
    step: '수집',
    notice_id: null,
    message: '오늘 새로 올라온 입법예고 14건을 확인했어요.',
    reason: null,
    included: null,
    created_at: daysAgoIso(0),
  },
  {
    id: 'log-2',
    run_at: daysAgoIso(0),
    step: '선별',
    notice_id: NOTICE_JUHYU_ID,
    message: '단시간 근로자 주휴수당 기준 변경안을 관련 법안으로 선별했어요.',
    reason: '프로필의 활동(아르바이트)·주당 근무시간 조건과 일치',
    included: true,
    created_at: daysAgoIso(0),
  },
  {
    id: 'log-3',
    run_at: daysAgoIso(0),
    step: '선별',
    notice_id: NOTICE_WOLSE_ID,
    message: '청년 월세 보증금 반환 지원안은 현재 프로필과 관련성이 낮아 제외했어요.',
    reason: '주거 형태 조건과 직접적인 연관 없음',
    included: false,
    created_at: daysAgoIso(0),
  },
  {
    id: 'log-4',
    run_at: daysAgoIso(0),
    step: '완료',
    notice_id: null,
    message: '오늘의 예고편 카드 생성을 완료했어요.',
    reason: null,
    included: null,
    created_at: daysAgoIso(0),
  },
];

// ---------- 가변 상태 (외부 스토어) ----------

interface DemoState {
  currentProfileId: string | null;
  cacheMode: boolean;
  opinions: Opinion[];
  notifications: AppNotification[];
  agentLogs: AgentLog[];
}

function initialState(): DemoState {
  return {
    currentProfileId: null,
    cacheMode: false,
    opinions: seedOpinions,
    notifications: seedNotifications,
    agentLogs: seedAgentLogs,
  };
}

let state: DemoState = initialState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<DemoState>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): DemoState {
  return state;
}

// ---------- 조회 헬퍼 (가변 상태 기반) ----------

export function getOpinionsForProfile(profileId: string | null): Opinion[] {
  return state.opinions.filter((o) => o.user_id === profileId);
}

export function getOpinionByNoticeId(
  profileId: string | null,
  noticeId: string,
): Opinion | undefined {
  return state.opinions.find((o) => o.user_id === profileId && o.notice_id === noticeId);
}

export function getOpinionById(id: string): Opinion | undefined {
  return state.opinions.find((o) => o.id === id);
}

export function getNotificationsForProfile(profileId: string | null): AppNotification[] {
  return state.notifications
    .filter((n) => n.user_id === profileId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getAgentLogs(): AgentLog[] {
  return [...state.agentLogs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function saveOpinion(opinion: Opinion) {
  const exists = state.opinions.some((o) => o.id === opinion.id);
  setState({
    opinions: exists
      ? state.opinions.map((o) => (o.id === opinion.id ? opinion : o))
      : [...state.opinions, opinion],
  });
}

// ---------- 데모 패널 액션 ----------

export function switchProfile(profileId: string | null) {
  setState({ currentProfileId: profileId });
}

export function toggleCacheMode() {
  setState({ cacheMode: !state.cacheMode });
}

const AGENT_STEP_SCRIPT: {
  step: AgentLog['step'];
  noticeId: string | null;
  message: string;
  reason: string | null;
  included: boolean | null;
}[] = [
  {
    step: '수집',
    noticeId: null,
    message: '새 입법예고 목록을 다시 확인했어요.',
    reason: null,
    included: null,
  },
  {
    step: '선별',
    noticeId: NOTICE_YOUTH_CONTRACT_ID,
    message: '청소년 근로계약서 미작성 과태료 개정안을 관련 법안으로 선별했어요.',
    reason: '프로필 나이대(10대)·활동(아르바이트) 조건과 일치',
    included: true,
  },
  {
    step: '요약',
    noticeId: null,
    message: '선별된 법안의 전후 비교와 개인화 문구를 다시 작성했어요.',
    reason: null,
    included: null,
  },
  { step: '완료', noticeId: null, message: '이번 실행을 마쳤어요.', reason: null, included: null },
];

/** "에이전트 실행" — agent_logs에 순차적으로 새 로그를 추가해 실시간 구독처럼 보이게 한다. */
export function runAgentStep() {
  AGENT_STEP_SCRIPT.forEach((entry, i) => {
    setTimeout(() => {
      const now = new Date().toISOString();
      const log: AgentLog = {
        id: uid('log'),
        run_at: now,
        step: entry.step,
        notice_id: entry.noticeId,
        message: entry.message,
        reason: entry.reason,
        included: entry.included,
        created_at: now,
      };
      setState({ agentLogs: [...state.agentLogs, log] });
    }, i * 700);
  });
}

/** "시간경과(D-1)" — 마감 임박 알림을 현재 프로필에 생성한다. */
export function advanceDay() {
  const profileId = state.currentProfileId;
  if (!profileId) return;
  const related = getRelatedNoticeCards(profileId)[0];
  if (!related) return;
  const notif: AppNotification = {
    id: uid('notif'),
    user_id: profileId,
    type: 'deadline',
    message: `"${related.card.easy_title}" 입법예고 마감이 하루 앞으로 다가왔어요.`,
    related_notice_id: related.notice.id,
    related_opinion_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  setState({ notifications: [...state.notifications, notif] });
}

/** "시간경과(위원회심사)" — 현재 프로필의 의견 진행 단계를 한 단계 진행시킨다. */
export function advanceCommittee() {
  const profileId = state.currentProfileId;
  if (!profileId) return;
  const opinion = state.opinions.find(
    (o) =>
      o.user_id === profileId &&
      o.submitted &&
      getTrackingStepIndex(o.last_tracking_status) < TRACKING_STEPS.length - 1,
  );
  if (!opinion) return;

  const nextIndex = getTrackingStepIndex(opinion.last_tracking_status) + 1;
  const nextStatus = TRACKING_STEPS[nextIndex];
  const updatedOpinion: Opinion = {
    ...opinion,
    last_tracking_status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  const card = seedCards.find((c) => c.notice_id === opinion.notice_id);
  const notif: AppNotification = {
    id: uid('notif'),
    user_id: profileId,
    type: 'progress',
    message: `"${card?.easy_title ?? '내 법안'}" 법안이 ${nextStatus} 단계로 이동했어요.`,
    related_notice_id: opinion.notice_id,
    related_opinion_id: opinion.id,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  setState({
    opinions: state.opinions.map((o) => (o.id === opinion.id ? updatedOpinion : o)),
    notifications: [...state.notifications, notif],
  });
}

export function markNotificationRead(id: string) {
  setState({
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
  });
}

export function resetDemo() {
  state = initialState();
  emit();
}

// mockData.ts의 조인 헬퍼를 재노출 — 페이지/훅은 demoStore만 import해도 되도록 한다.
export { joinNoticeCard as getNoticeCardById } from './mockData';
