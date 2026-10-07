import { productUrl } from '@rdl/core';
import Link from 'next/link';
import { AsinCharts, type SnapshotPoint } from '@/components/tracking/charts/AsinCharts';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function TrackedAsinPage({ params }: PageProps<'/tracking/asin/[asin]'>) {
  const { asin } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: snaps }] = await Promise.all([
    supabase.from('products').select('title').eq('asin', asin).maybeSingle(),
    supabase.from('product_snapshots').select('captured_at, bsr, price_cents, reviews_count, rating, est_daily_sales').eq('asin', asin).order('captured_at'),
  ]);
  // Un punto per giorno (ultima rilevazione del giorno)
  const byDay = new Map<string, SnapshotPoint>();
  for (const s of snaps ?? []) {
    byDay.set(s.captured_at.slice(0, 10), {
      date: s.captured_at.slice(5, 10),
      bsr: s.bsr,
      price: s.price_cents,
      reviews: s.reviews_count,
      rating: s.rating,
      sales: s.est_daily_sales,
    });
  }
  const data = Array.from(byDay.values());

  return (
    <>
      <PageTitle
        actions={
          <span className="flex gap-3 text-sm">
            <Link href={`/prodotti/${asin}`} className="underline">
              scheda prodotto
            </Link>
            <a href={productUrl(asin)} target="_blank" rel="noreferrer" className="underline">
              amazon.it ↗
            </a>
            <Link href="/tracking/asin" className="underline">
              ← tutti gli ASIN
            </Link>
          </span>
        }
      >
        {product?.title ?? asin}
      </PageTitle>
      <p className="mb-4 text-sm text-slate-500">
        {asin} · {data.length} giorni di rilevazioni
      </p>
      {data.length ? <AsinCharts data={data} /> : <p className="text-sm text-slate-400">Nessuna rilevazione ancora: esegui il tracking o visita la pagina su amazon.it con l’estensione attiva.</p>}
    </>
  );
}
