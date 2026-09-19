// 정적 시드 데이터: 프로필(윤채원/강도윤) · 입법예고(notices) · 카드(cards)
// 가변 데모 상태(opinions/notifications/agent_logs)는 demoStore.ts에서 관리한다.

import type { Card, Notice, NoticeCard, Profile } from '../types/database';

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const TRACKING_STEPS = [
  '입법예고 종료',
  '위원회 심사',
  '법사위 심사',
  '본회의',
  '결과',
] as const;

export function getTrackingStepIndex(status: string | null): number {
  if (!status) return 0;
  const idx = TRACKING_STEPS.indexOf(status as (typeof TRACKING_STEPS)[number]);
  return idx === -1 ? 0 : idx;
}

export function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** D-day를 화면 표시용 문구로 바꾼다. 음수(마감 지남)일 때 "D--1"처럼 깨지지 않게 한다. */
export function formatDDay(dDay: number | null): string {
  if (dDay === null) return '마감일 미정';
  if (dDay < 0) return '마감 지남';
  return `마감 D-${dDay}`;
}

export function getRelativeTime(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return '오늘';
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

// ---------- 페르소나 ----------
// 실제 Supabase profiles 행의 id (api/_lib/demoProfiles.ts가 만든 auth 사용자 기준).
// card_impacts.profile_id가 profiles(id)를 참조하는 FK라, 데모 페르소나도 실제 DB 행이 있어야 한다.

export const CHAEWON_ID = '644dc8bd-2042-4fc7-8c1b-3d4896fbaab2';
export const DOYOON_ID = '240a138a-5713-4eb2-a009-bc94bd7c1225';

export const seedProfiles: Profile[] = [
  {
    id: CHAEWON_ID,
    display_name: '윤채원',
    age_group: '10대',
    activities: ['아르바이트'],
    weekly_hours: 15,
    housing_type: '가족과 함께 거주',
    housing_contract_plan: false,
    finance: ['해당 없음'],
    interests: ['노동', '청년지원'],
    notify_time: '20:00',
    notify_limit_per_day: 2,
    created_at: daysAgoIso(10),
  },
  {
    id: DOYOON_ID,
    display_name: '강도윤',
    age_group: '20대',
    activities: ['정규직(입사 1년차)'],
    weekly_hours: 40,
    housing_type: '월세',
    housing_contract_plan: true,
    finance: ['학자금 대출'],
    interests: ['주거', '금융'],
    notify_time: '20:00',
    notify_limit_per_day: 2,
    created_at: daysAgoIso(20),
  },
];

export function getProfiles(): Profile[] {
  return seedProfiles;
}

export function getProfileById(id: string | null): Profile | undefined {
  return seedProfiles.find((p) => p.id === id);
}

/**
 * 화면에 표시할 안전한 이름. currentProfileId가 데모 페르소나(채원/도윤)면 그 이름을,
 * 그 외(예: /start의 ProfileForm으로 실제 Supabase profiles에 만들어진 진짜 사용자)라면
 * "undefined"가 그대로 노출되지 않도록 일반 문구로 대체한다.
 * (ProfileForm은 이름/닉네임을 받지 않으므로 진짜 이름을 알 방법이 없다 — 스키마에 없음)
 */
export function describeProfileName(id: string | null): string | null {
  if (!id) return null;
  return getProfileById(id)?.display_name ?? '회원';
}

// ---------- 입법예고 / 카드 ----------

export const NOTICE_JUHYU_ID = 'notice-juhyu';
export const NOTICE_WOLSE_ID = 'notice-wolse';
export const NOTICE_YOUTH_CONTRACT_ID = 'notice-youth-contract';

export const seedNotices: Notice[] = [
  {
    id: NOTICE_JUHYU_ID,
    bill_id: 'PRC-2026-0142',
    committee: '환경노동위원회',
    propose_date: daysAgoIso(10).slice(0, 10),
    notice_end: daysFromNow(6),
    proposal_reason: '단시간 근로자의 주휴수당 사각지대를 줄이기 위함',
    main_content: '주휴수당 적용 근무시간 기준을 주 15시간에서 10시간으로 완화',
    current_law_text: '근로기준법 제55조: 1주 15시간 이상 근무 시 주휴수당 지급',
    source_url: 'https://opinion.assembly.go.kr',
    raw_data: { official_title: '근로기준법 일부개정법률안' },
    created_at: daysAgoIso(2),
  },
  {
    id: NOTICE_WOLSE_ID,
    bill_id: 'PRC-2026-0187',
    committee: '국토교통위원회',
    propose_date: daysAgoIso(15).slice(0, 10),
    notice_end: daysFromNow(3),
    proposal_reason: '청년 세입자의 보증금 미반환 위험 완화',
    main_content: '청년 월세 보증금 반환 보증 지원 대상을 보증금 5억 원 이하까지 확대',
    current_law_text: '주택도시기금법: 보증금 3억 원 이하 주택만 반환 보증 지원',
    source_url: 'https://opinion.assembly.go.kr',
    raw_data: { official_title: '주택도시기금법 일부개정법률안' },
    created_at: daysAgoIso(1),
  },
  {
    id: NOTICE_YOUTH_CONTRACT_ID,
    bill_id: 'PRC-2026-0210',
    committee: '환경노동위원회',
    propose_date: daysAgoIso(5).slice(0, 10),
    notice_end: daysFromNow(9),
    proposal_reason: '청소년 근로자의 근로계약서 미작성으로 인한 피해 방지',
    main_content: '만 18세 미만 근로자 채용 시 근로계약서 작성·교부 의무 위반에 대한 과태료 상향',
    current_law_text:
      '근로기준법 제17조·제67조: 근로계약서 작성·교부 의무, 현행 과태료 500만 원 이하',
    source_url: 'https://opinion.assembly.go.kr',
    raw_data: { official_title: '근로기준법 일부개정법률안(청소년 보호)' },
    created_at: daysAgoIso(3),
  },
];

export const seedCards: Card[] = [
  {
    id: 'card-juhyu',
    notice_id: NOTICE_JUHYU_ID,
    category: '노동',
    relevance_score: 0.94,
    relevance_reason:
      '아르바이트로 주 15시간 근무 중이라면, 이 법안이 원안대로 통과되면 이미 주휴수당 대상이지만 시간이 더 짧은 친구들도 새로 포함될 수 있어요.',
    easy_title: '단시간 근로자 주휴수당 기준이 바뀔 수 있어요',
    one_line:
      '주휴수당을 받을 수 있는 근무시간 기준을 주 15시간에서 10시간으로 낮추자는 법안이에요.',
    before_text: '주 15시간 이상 일해야 주휴수당 대상',
    after_text: '주 10시간 이상이면 대상이 될 수 있음',
    pros: ['더 많은 단시간 근로자가 주휴수당 보호를 받게 돼요.'],
    cons: ['사업장이 근무시간을 더 잘게 나누는 방식으로 대응할 수 있다는 우려가 있어요.'],
    created_at: daysAgoIso(2),
  },
  {
    id: 'card-wolse',
    notice_id: NOTICE_WOLSE_ID,
    category: '주거',
    relevance_score: 0.81,
    relevance_reason:
      '월세로 거주 중이고 1년 안에 재계약 예정이라, 보증금 반환 보증 지원 확대 대상에 포함될 가능성이 있어요.',
    easy_title: '청년 월세 보증금 반환 지원이 넓어져요',
    one_line: '청년 보증금 반환 보증의 지원 범위를 확대하는 법안이에요.',
    before_text: '보증금 3억 원 이하 주택만 지원',
    after_text: '보증금 5억 원 이하 주택까지 지원 확대',
    pros: ['더 많은 청년 세입자가 보증금 반환 보증을 이용할 수 있어요.'],
    cons: ['보증 재원 확대에 따른 예산 부담이 늘어날 수 있어요.'],
    created_at: daysAgoIso(1),
  },
  {
    id: 'card-youth-contract',
    notice_id: NOTICE_YOUTH_CONTRACT_ID,
    category: '노동',
    relevance_score: 0.89,
    relevance_reason:
      '10대 아르바이트생이라면, 이 개정안으로 사업장이 근로계약서를 반드시 작성해줘야 할 의무가 더 강해져요.',
    easy_title: '청소년 근로계약서 미작성 과태료가 올라가요',
    one_line: '18세 미만 근로자에게 근로계약서를 안 써주면 사업장에 더 큰 과태료가 부과돼요.',
    before_text: '근로계약서 미작성 시 과태료 500만 원 이하',
    after_text: '근로계약서 미작성 시 과태료 상향 및 즉시 신고 절차 신설',
    pros: ['청소년 근로자가 근무조건을 서면으로 확실히 보장받을 수 있어요.'],
    cons: ['영세 사업장의 행정 부담이 늘어날 수 있다는 우려가 있어요.'],
    created_at: daysAgoIso(3),
  },
];

// 프로필별 관련 입법예고 매핑 — 실제로는 에이전트가 profile 조건을 notices에 대입해 계산한다.
export const relevanceByProfile: Record<string, string[]> = {
  [CHAEWON_ID]: [NOTICE_JUHYU_ID, NOTICE_YOUTH_CONTRACT_ID],
  [DOYOON_ID]: [NOTICE_WOLSE_ID],
};

export function joinNoticeCard(noticeId: string): NoticeCard | undefined {
  const notice = seedNotices.find((n) => n.id === noticeId);
  const card = seedCards.find((c) => c.notice_id === noticeId);
  if (!notice || !card) return undefined;
  return { notice, card };
}

export function getAllNoticeCards(): NoticeCard[] {
  return seedNotices.map((n) => joinNoticeCard(n.id)).filter((v): v is NoticeCard => Boolean(v));
}

export function getRelatedNoticeCards(profileId: string | null): NoticeCard[] {
  const ids = profileId ? (relevanceByProfile[profileId] ?? []) : [];
  return ids.map(joinNoticeCard).filter((v): v is NoticeCard => Boolean(v));
}

export function getOtherNoticeCards(profileId: string | null): NoticeCard[] {
  const relatedIds = new Set(profileId ? (relevanceByProfile[profileId] ?? []) : []);
  return seedNotices
    .filter((n) => !relatedIds.has(n.id))
    .map((n) => joinNoticeCard(n.id))
    .filter((v): v is NoticeCard => Boolean(v));
}

export function getNoticeCardById(noticeId: string): NoticeCard | undefined {
  return joinNoticeCard(noticeId);
}
