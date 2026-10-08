-- Reverse ASIN lanciati da un Deep View (per aggregare le keyword dei concorrenti)
alter table public.reverse_asin_runs
  add column deep_view_id uuid references public.deep_views(id) on delete set null;
create index reverse_asin_runs_deep_view_idx on public.reverse_asin_runs(deep_view_id) where deep_view_id is not null;
