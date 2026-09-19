-- 카드(법안)별 · 프로필별 개인화 판단 결과. P3 "나의 경우"와 P8 두 사람 비교의 근거가 된다.

create table card_impacts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id),
  profile_id uuid references profiles(id),
  is_relevant boolean,
  impact_text text,           -- "카페에서 주 12시간 일하고 계셔서 적용될 수 있어요" 같은 개인화 문장
  calculation_basis text,     -- "프로필의 '아르바이트', '주당 12시간'을 기준으로 판단했어요" (명세서 SP 근거 표시용)
  created_at timestamptz default now(),
  -- explain-impact가 (card_id, profile_id) 조합 기준으로 upsert하므로 유니크 제약이 필요하다.
  unique (card_id, profile_id)
);

alter table card_impacts enable row level security;
create policy "card_impacts는 전체 조회" on card_impacts for select using (true);
