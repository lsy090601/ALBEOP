-- 알법 스키마 전면 교체: profiles/notices/cards/opinions/notifications/agent_logs

drop table if exists opinions cascade;
drop table if exists bill_cards cascade;
drop table if exists users cascade;

create table profiles (
  id uuid primary key references auth.users(id),
  age_group text,
  activities text[],
  weekly_hours int,
  housing_type text,
  housing_contract_plan boolean default false,
  finance text[],
  interests text[],
  notify_time time default '20:00',
  notify_limit_per_day int default 2,
  created_at timestamptz default now()
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  bill_id text unique not null,
  committee text,
  propose_date date,
  notice_end date,
  proposal_reason text,
  main_content text,
  current_law_text text,
  source_url text,
  raw_data jsonb,
  created_at timestamptz default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid references notices(id),
  category text,
  relevance_score float,
  relevance_reason text,
  easy_title text,
  one_line text,
  before_text text,
  after_text text,
  pros text[],
  cons text[],
  created_at timestamptz default now()
);

create table opinions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  notice_id uuid references notices(id),
  stance text,
  status text default 'draft',
  interview jsonb,
  draft_text text,
  summary jsonb,
  submitted boolean default false,
  last_tracking_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  type text,
  message text,
  related_notice_id uuid references notices(id),
  related_opinion_id uuid references opinions(id),
  is_read boolean default false,
  created_at timestamptz default now()
);

create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz default now(),
  step text,
  notice_id uuid references notices(id),
  message text,
  reason text,
  included boolean,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table opinions enable row level security;
alter table notifications enable row level security;
alter table cards enable row level security;
alter table notices enable row level security;
alter table agent_logs enable row level security;

create policy "본인 프로필만" on profiles for all using (auth.uid() = id);
create policy "본인 의견만" on opinions for all using (auth.uid() = user_id);
create policy "본인 알림만" on notifications for all using (auth.uid() = user_id);
create policy "카드는 전체 조회" on cards for select using (true);
create policy "notices는 전체 조회" on notices for select using (true);
create policy "agent_logs는 전체 조회" on agent_logs for select using (true);
