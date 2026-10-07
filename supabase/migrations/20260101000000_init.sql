-- Schema iniziale: profili, token estensione, keyword, sessioni di ricerca, nicchie
create extension if not exists pg_trgm;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'personal',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  label text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_tokens_user_idx on public.api_tokens(user_id);

create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  marketplace text not null default 'it' check (marketplace in ('it')),
  text text not null,
  normalized text not null,
  created_at timestamptz not null default now(),
  unique (user_id, marketplace, normalized)
);
create index keywords_normalized_trgm_idx on public.keywords using gin (normalized gin_trgm_ops);

create table public.research_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  seed text not null,
  alias text not null default 'stripbooks',
  options jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index research_sessions_user_idx on public.research_sessions(user_id, created_at desc);

create table public.keyword_suggestions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.research_sessions(id) on delete cascade,
  suggestion text not null,
  normalized text not null,
  source_query text not null,
  position smallint,
  depth smallint not null default 0,
  alias text not null,
  created_at timestamptz not null default now(),
  unique (session_id, normalized)
);
create index keyword_suggestions_session_idx on public.keyword_suggestions(session_id);

create table public.niches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index niches_user_idx on public.niches(user_id, updated_at desc);

create table public.niche_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  niche_id uuid not null references public.niches(id) on delete cascade,
  kind text not null check (kind in ('keyword', 'asin')),
  keyword_id uuid references public.keywords(id) on delete cascade,
  asin text,
  note text,
  created_at timestamptz not null default now(),
  check ((kind = 'keyword' and keyword_id is not null) or (kind = 'asin' and asin is not null))
);
create index niche_items_niche_idx on public.niche_items(niche_id);
