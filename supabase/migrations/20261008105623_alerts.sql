-- Avvisi generati dal tracking (perdita posizioni, BSR peggiorato, ecc.)
create table public.alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('rank_drop', 'rank_gain', 'rank_lost', 'rank_found', 'bsr_worse', 'bsr_better', 'price_change', 'reviews_jump')),
  severity text not null default 'info' check (severity in ('info', 'warn', 'good')),
  asin text,
  tracked_keyword_id uuid references public.tracked_keywords(id) on delete cascade,
  keyword text,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index alerts_user_idx on public.alerts(user_id, created_at desc);
create index alerts_unread_idx on public.alerts(user_id) where read_at is null;
alter table public.alerts enable row level security;
create policy "alerts: own rows" on public.alerts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
