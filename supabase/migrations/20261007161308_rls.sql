-- Row Level Security: ogni utente vede solo le proprie righe; prodotti e snapshot sono cache condivisa in sola lettura
alter table public.profiles enable row level security;
drop policy if exists "profiles: own" on public.profiles;
create policy "profiles: own" on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'api_tokens', 'keywords', 'research_sessions', 'keyword_suggestions', 'niches', 'niche_items',
    'serp_snapshots', 'serp_items', 'jobs', 'deep_views', 'reverse_asin_runs', 'reverse_asin_results',
    'tracked_keywords', 'tracked_asins', 'keyword_rank_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || ': own rows', t);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t || ': own rows', t);
  end loop;
end $$;

alter table public.products enable row level security;
drop policy if exists "products: read" on public.products;
create policy "products: read" on public.products for select to authenticated using (true);

alter table public.product_snapshots enable row level security;
drop policy if exists "product_snapshots: read" on public.product_snapshots;
create policy "product_snapshots: read" on public.product_snapshots for select to authenticated using (true);
-- Nessuna policy di scrittura su products/product_snapshots: scrive solo il service role (route /api/ext e server actions)
