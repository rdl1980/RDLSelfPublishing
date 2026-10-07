import { TrackedAsinsList } from '@/components/tracking/TrackedAsinsList';
import { RunTrackingButton } from '@/components/tracking/RunTrackingButton';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function TrackingAsinPage() {
  const supabase = await createClient();
  const { data: tracked } = await supabase.from('tracked_asins').select('*').order('created_at', { ascending: false });
  const asins = (tracked ?? []).map((t) => t.asin);
  const [{ data: products }, { data: snaps }] = await Promise.all([
    asins.length ? supabase.from('products').select('asin, title, image_url, is_independent').in('asin', asins) : Promise.resolve({ data: [] }),
    asins.length
      ? supabase.from('product_snapshots').select('asin, captured_at, bsr, price_cents, reviews_count, rating, est_daily_sales').in('asin', asins).order('captured_at', { ascending: false }).limit(2000)
      : Promise.resolve({ data: [] }),
  ]);
  const productOf = new Map((products ?? []).map((p) => [p.asin, p]));
  const lastOf = new Map<string, NonNullable<typeof snaps>[number]>();
  const prevOf = new Map<string, NonNullable<typeof snaps>[number]>();
  for (const s of snaps ?? []) {
    if (!lastOf.has(s.asin)) lastOf.set(s.asin, s);
    else if (!prevOf.has(s.asin) && s.captured_at.slice(0, 10) !== lastOf.get(s.asin)!.captured_at.slice(0, 10)) prevOf.set(s.asin, s);
  }

  const rows = (tracked ?? []).map((t) => {
    const p = productOf.get(t.asin);
    const l = lastOf.get(t.asin);
    const prev = prevOf.get(t.asin);
    return {
      id: t.id,
      asin: t.asin,
      label: t.label,
      isMine: t.is_mine,
      active: t.active,
      lastRunAt: t.last_run_at,
      title: p?.title ?? null,
      imageUrl: p?.image_url ?? null,
      isIndependent: p?.is_independent ?? null,
      bsr: l?.bsr ?? null,
      bsrPrev: prev?.bsr ?? null,
      priceCents: l?.price_cents ?? null,
      reviews: l?.reviews_count ?? null,
      rating: l?.rating ?? null,
      dailySales: l?.est_daily_sales ?? null,
      capturedAt: l?.captured_at ?? null,
    };
  });

  return (
    <>
      <PageTitle actions={<RunTrackingButton />}>Tracking ASIN</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        BSR, prezzo e recensioni nel tempo per i libri che segui (i tuoi e quelli dei concorrenti). Rilevazione giornaliera tramite l&apos;estensione.
      </p>
      <TrackedAsinsList rows={rows} />
    </>
  );
}
