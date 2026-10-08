-- Reverse ASIN su più libri con una sola ricerca per keyword: ogni risultato dice per quale ASIN vale
alter table public.reverse_asin_results add column asin text;
create index reverse_asin_results_run_asin_idx on public.reverse_asin_results(run_id, asin);
