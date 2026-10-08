-- Contenuto dell'inserzione (bullet, descrizione, A+) per l'analisi dei concorrenti
alter table public.products
  add column bullets text[] not null default '{}',
  add column description text,
  add column aplus_modules int,
  add column listing_updated_at timestamptz;

-- Gli snapshot prodotto raccolti da una scansione di categoria hanno una fonte propria
alter table public.product_snapshots drop constraint product_snapshots_source_check;
alter table public.product_snapshots
  add constraint product_snapshots_source_check
  check (source in ('quick_view', 'product_page', 'deep_view', 'tracker', 'manual', 'category'));
