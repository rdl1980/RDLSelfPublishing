-- Tracking keyword e ASIN
create table public.tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  alias text not null default 'stripbooks',
  pages smallint not null default 3,
  watch_asins text[] not null default '{}',
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, keyword_id, alias)
);

create table public.tracked_asins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asin text not null,
  label text,
  is_mine boolean not null default false,
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, asin)
);

create table public.keyword_rank_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tracked_keyword_id uuid not null references public.tracked_keywords(id) on delete cascade,
  asin text not null,
  captured_at timestamptz not null default now(),
  found boolean not null,
  page smallint,
  position smallint,
  organic_position smallint,
  absolute_position smallint,
  is_sponsored boolean,
  serp_snapshot_id uuid references public.serp_snapshots(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null
);
create index keyword_rank_snapshots_idx on public.keyword_rank_snapshots(tracked_keyword_id, asin, captured_at desc);
