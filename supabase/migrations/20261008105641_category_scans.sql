-- Category explorer: scansioni di Best Seller / Nuove uscite di una categoria
create table public.category_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id text not null,
  category_name text,
  kind text not null default 'bestsellers' check (kind in ('bestsellers', 'new_releases')),
  pages smallint not null default 1,
  job_id uuid references public.jobs(id) on delete set null,
  summary jsonb,
  created_at timestamptz not null default now()
);
create index category_scans_user_idx on public.category_scans(user_id, created_at desc);

create table public.category_scan_items (
  id bigint generated always as identity primary key,
  scan_id uuid not null references public.category_scans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asin text not null,
  rank smallint not null,
  title text,
  author text,
  format text,
  price_cents int,
  rating numeric(3, 2),
  reviews_count int,
  pub_date date,
  image_url text,
  unique (scan_id, asin)
);
create index category_scan_items_scan_idx on public.category_scan_items(scan_id, rank);

alter table public.category_scans enable row level security;
create policy "category_scans: own rows" on public.category_scans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.category_scan_items enable row level security;
create policy "category_scan_items: own rows" on public.category_scan_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
