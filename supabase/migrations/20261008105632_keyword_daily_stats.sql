-- Serie storica giornaliera per keyword (stagionalità): una riga per keyword, catalogo e giorno
create table public.keyword_daily_stats (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  alias text not null default 'stripbooks',
  day date not null,
  total_results_est int,
  organic_count smallint,
  sponsored_count smallint,
  median_price_cents int,
  median_reviews int,
  top10_est_monthly_sales numeric(10, 2),
  new_books_share numeric(4, 3),
  source text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, keyword_id, alias, day)
);
create index keyword_daily_stats_kw_idx on public.keyword_daily_stats(keyword_id, day);
alter table public.keyword_daily_stats enable row level security;
create policy "keyword_daily_stats: own rows" on public.keyword_daily_stats for all using (user_id = auth.uid()) with check (user_id = auth.uid());
