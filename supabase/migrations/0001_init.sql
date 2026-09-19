-- 알법 초기 스키마: users, bill_cards, opinions

-- users (프로필)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  work_type text,
  weekly_hours int,
  workplaces int,
  housing_type text,
  finance text[],
  interests text[],
  notify_limit_per_day int not null default 2,
  created_at timestamptz not null default now()
);

-- bill_cards (수집·선별된 법안 캐시)
create table if not exists public.bill_cards (
  id uuid primary key default gen_random_uuid(),
  bill_id text not null unique,
  category text,
  relevance_score float,
  relevance_reason text,
  notice_end date,
  easy_title text,
  one_line text,
  before_text text,
  after_text text,
  pros text[],
  cons text[],
  source_url text,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

-- opinions (의견서)
create table if not exists public.opinions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bill_id text not null references public.bill_cards (bill_id) on delete cascade,
  stance text,
  status text,
  summary jsonb,
  draft_text text,
  submitted boolean not null default false,
  last_tracking_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.bill_cards enable row level security;
alter table public.opinions enable row level security;

-- users: 본인 행만 조회/추가/수정 가능
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- bill_cards: 인증된 사용자는 모두 조회 가능, 쓰기는 서비스롤 키로만 (정책 없음 = 기본 거부)
create policy "bill_cards_select_authenticated" on public.bill_cards
  for select using (auth.role() = 'authenticated');

-- opinions: 본인 행만 조회/추가/수정 가능
create policy "opinions_select_own" on public.opinions
  for select using (auth.uid() = user_id);

create policy "opinions_insert_own" on public.opinions
  for insert with check (auth.uid() = user_id);

create policy "opinions_update_own" on public.opinions
  for update using (auth.uid() = user_id);
