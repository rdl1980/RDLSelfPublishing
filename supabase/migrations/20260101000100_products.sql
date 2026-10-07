-- Prodotti (cache condivisa), snapshot prodotto, snapshot SERP
create table public.products (
  asin text primary key check (asin ~ '^[A-Z0-9]{10}$'),
  marketplace text not null default 'it',
  title text,
  subtitle text,
  authors text[] not null default '{}',
  image_url text,
  format text,
  publisher text,
  is_independent boolean,
  pub_date date,
  language text,
  page_count int,
  isbn13 text,
  dimensions text,
  has_aplus boolean,
  categories jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_independent_idx on public.products(is_independent) where is_independent;
create index products_title_fts_idx on public.products using gin (to_tsvector('italian', coalesce(title, '')));

create table public.product_snapshots (
  id bigint generated always as identity primary key,
  asin text not null references public.products(asin) on delete cascade,
  captured_at timestamptz not null default now(),
  source text not null check (source in ('quick_view', 'product_page', 'deep_view', 'tracker', 'manual')),
  job_id uuid,
  bsr int,
  bsr_store text check (bsr_store in ('books', 'kindle')),
  category_ranks jsonb not null default '[]'::jsonb,
  price_cents int,
  currency text not null default 'EUR',
  rating numeric(3, 2),
  reviews_count int,
  formats jsonb not null default '[]'::jsonb,
  est_daily_sales numeric(8, 2)
);
create index product_snapshots_asin_idx on public.product_snapshots(asin, captured_at desc);
create index product_snapshots_job_idx on public.product_snapshots(job_id) where job_id is not null;

create table public.serp_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword_id uuid not null references public.keywords(id) on delete cascade,
  alias text not null default 'stripbooks',
  page smallint not null default 1,
  captured_at timestamptz not null default now(),
  source text not null check (source in ('quick_view', 'deep_view', 'tracker', 'reverse_asin')),
  job_id uuid,
  total_results_text text,
  total_results_est int,
  organic_count smallint,
  sponsored_count smallint
);
create index serp_snapshots_user_kw_idx on public.serp_snapshots(user_id, keyword_id, captured_at desc);
create index serp_snapshots_job_idx on public.serp_snapshots(job_id) where job_id is not null;

create table public.serp_items (
  id bigint generated always as identity primary key,
  serp_snapshot_id uuid not null references public.serp_snapshots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asin text not null,
  position smallint not null,
  organic_position smallint,
  is_sponsored boolean not null default false,
  title text,
  author text,
  format text,
  price_cents int,
  rating numeric(3, 2),
  reviews_count int,
  pub_date date,
  image_url text
);
create index serp_items_snapshot_idx on public.serp_items(serp_snapshot_id, position);
create index serp_items_user_asin_idx on public.serp_items(user_id, asin);
