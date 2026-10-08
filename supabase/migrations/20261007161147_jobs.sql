-- Coda job eseguiti dall'estensione (pull model), Deep View, Reverse ASIN
create type public.job_status as enum ('pending', 'running', 'done', 'failed', 'cancelled');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deep_view', 'reverse_asin', 'enrich_asins', 'track_keyword', 'track_asins', 'category_scan', 'ai_reserved')),
  params jsonb not null,
  status public.job_status not null default 'pending',
  priority smallint not null default 0,
  scheduled_for timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  heartbeat_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  progress jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index jobs_dedupe_idx on public.jobs(user_id, dedupe_key) where dedupe_key is not null;
create index jobs_queue_idx on public.jobs(user_id, status, scheduled_for, priority desc);

alter table public.product_snapshots
  add constraint product_snapshots_job_fk foreign key (job_id) references public.jobs(id) on delete set null;
alter table public.serp_snapshots
  add constraint serp_snapshots_job_fk foreign key (job_id) references public.jobs(id) on delete set null;

-- Claim atomico: chiamata solo dal server (service role)
create function public.claim_jobs(p_user_id uuid, p_worker text, p_limit int default 3)
returns setof public.jobs language sql as $$
  update public.jobs j
     set status = 'running',
         claimed_at = now(),
         claimed_by = p_worker,
         started_at = coalesce(j.started_at, now()),
         heartbeat_at = now(),
         attempts = j.attempts + 1,
         updated_at = now()
   where j.id in (
     select id from public.jobs
      where user_id = p_user_id and status = 'pending' and scheduled_for <= now()
      order by priority desc, scheduled_for
      limit p_limit
      for update skip locked)
  returning j.*;
$$;

-- Riporta a pending (o failed) i job running senza heartbeat da oltre 15 minuti
create function public.requeue_stale_jobs(p_user_id uuid) returns int language sql as $$
  with u as (
    update public.jobs
       set status = case when attempts >= max_attempts then 'failed'::public.job_status else 'pending'::public.job_status end,
           error = case when attempts >= max_attempts then 'stale: tentativi esauriti' else error end,
           updated_at = now()
     where user_id = p_user_id and status = 'running' and heartbeat_at < now() - interval '15 minutes'
     returning 1)
  select count(*)::int from u;
$$;

revoke execute on function public.claim_jobs(uuid, text, int) from anon, authenticated;
revoke execute on function public.requeue_stale_jobs(uuid) from anon, authenticated;

create table public.deep_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  alias text not null default 'stripbooks',
  pages smallint not null default 2,
  job_id uuid references public.jobs(id) on delete set null,
  summary jsonb,
  created_at timestamptz not null default now()
);
create index deep_views_user_idx on public.deep_views(user_id, created_at desc);

create table public.reverse_asin_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asin text not null,
  job_id uuid references public.jobs(id) on delete set null,
  candidates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index reverse_asin_runs_user_idx on public.reverse_asin_runs(user_id, created_at desc);

create table public.reverse_asin_results (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.reverse_asin_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword text not null,
  found boolean not null,
  page smallint,
  position smallint,
  organic_position smallint,
  total_results_est int,
  checked_at timestamptz not null default now()
);
create index reverse_asin_results_run_idx on public.reverse_asin_results(run_id);
