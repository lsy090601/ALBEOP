// 데모 페르소나(윤채원/강도윤)를 실제 Supabase profiles 행으로 보장한다.
//
// profiles.id는 auth.users(id)를 참조하는 FK라, card_impacts에 값을 넣으려면
// "채원"/"도윤"도 실제 auth 사용자 + profiles 행이 있어야 한다. 고정 이메일로
// 존재 여부를 확인해 idempotent하게 만들거나 재사용한다(매 실행마다 새로 만들지 않음).

import { supabaseAdmin } from './supabaseAdmin.ts';

export type DemoPersonaKey = 'chaewon' | 'doyoon';

interface DemoPersonaSeed {
  email: string;
  displayName: string;
  age_group: string;
  activities: string[];
  weekly_hours: number;
  housing_type: string;
  housing_contract_plan: boolean;
  finance: string[];
  interests: string[];
}

export const DEMO_PERSONAS: Record<DemoPersonaKey, DemoPersonaSeed> = {
  chaewon: {
    email: 'chaewon.demo@albeop.app',
    displayName: '윤채원',
    age_group: '10대',
    activities: ['아르바이트'],
    weekly_hours: 15,
    housing_type: '가족과 함께 거주',
    housing_contract_plan: false,
    finance: ['해당 없음'],
    interests: ['노동', '청년지원'],
  },
  doyoon: {
    email: 'doyoon.demo@albeop.app',
    displayName: '강도윤',
    age_group: '20대',
    activities: ['정규직(입사 1년차)'],
    weekly_hours: 40,
    housing_type: '월세',
    housing_contract_plan: true,
    finance: ['학자금 대출'],
    interests: ['주거', '금융'],
  },
};

async function getOrCreateAuthUser(email: string): Promise<string> {
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID(), // 데모용 — 실제 로그인 경로로 쓰이지 않는다.
  });
  if (!createError && created.user) return created.user.id;

  // 이미 있으면(재실행) 목록에서 이메일로 찾는다.
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw new Error(`auth 사용자 조회 실패: ${listError.message}`);

  const existing = listData.users.find((u) => u.email === email);
  if (existing) return existing.id;

  throw new Error(
    `데모 프로필용 auth 사용자를 만들지도, 찾지도 못했어요: ${createError?.message ?? '알 수 없는 오류'}`,
  );
}

const resolvedIds = new Map<DemoPersonaKey, string>();

/** 페르소나의 실제 Supabase profiles.id를 반환한다. 없으면 auth 사용자 + profiles 행을 만든다. */
export async function getOrCreateDemoProfileId(persona: DemoPersonaKey): Promise<string> {
  const cached = resolvedIds.get(persona);
  if (cached) return cached;

  const seed = DEMO_PERSONAS[persona];
  const userId = await getOrCreateAuthUser(seed.email);

  const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    age_group: seed.age_group,
    activities: seed.activities,
    weekly_hours: seed.weekly_hours,
    housing_type: seed.housing_type,
    housing_contract_plan: seed.housing_contract_plan,
    finance: seed.finance,
    interests: seed.interests,
    notify_time: '20:00',
    notify_limit_per_day: 2,
    difficulty: seed.age_group === '10대' ? '쉬움' : '보통',
  });
  if (upsertError) throw new Error(`profiles upsert 실패: ${upsertError.message}`);

  resolvedIds.set(persona, userId);
  return userId;
}

export async function getAllDemoProfileIds(): Promise<Record<DemoPersonaKey, string>> {
  const chaewon = await getOrCreateDemoProfileId('chaewon');
  const doyoon = await getOrCreateDemoProfileId('doyoon');
  return { chaewon, doyoon };
}
