import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ListingAnalysis,
  type ListingRow,
  type MineOption,
} from '@/components/deep-view/ListingAnalysis';
import { PageTitle } from '@/components/ui';
import { loadDeepViewRows } from '@/lib/db/jobs';
import { createClient, getUser } from '@/lib/supabase/server';

/** Analisi delle inserzioni dei top risultati di un Deep View, a confronto con un libro tuo. */
export default async function ListingsPage({
  params,
  searchParams,
}: PageProps<'/deep-view/[id]/inserzioni'>) {
  const { id } = await params;
  const sp = await searchParams;
  const topN = Math.min(25, Math.max(5, Number(sp.top ?? 10) || 10));
  const user = await getUser();
  const supabase = await createClient();
  const { data: dv } = await supabase
    .from('deep_views')
    .select('id, job_id, keyword:keywords(text)')
    .eq('id', id)
    .maybeSingle();
  if (!dv || !user) notFound();
  const keyword = (dv.keyword as unknown as { text: string } | null)?.text ?? '';

  const rows: ListingRow[] = [];
  if (dv.job_id) {
    const { items } = await loadDeepViewRows(user.id, dv.job_id);
    const seen = new Set<string>();
    const top = items
      .filter((i) => !i.isSponsored && !seen.has(i.asin) && seen.add(i.asin))
      .slice(0, topN);
    const asins = top.map((i) => i.asin);
    const { data: products } = asins.length
      ? await supabase
          .from('products')
          .select(
            'asin, title, subtitle, bullets, description, has_aplus, aplus_modules, is_independent, listing_updated_at',
          )
          .in('asin', asins)
      : { data: [] };
    const byAsin = new Map((products ?? []).map((p) => [p.asin, p]));
    for (const [idx, it] of top.entries()) {
      const p = byAsin.get(it.asin);
      rows.push({
        asin: it.asin,
        position: idx + 1,
        title: p?.title ?? it.title,
        subtitle: p?.subtitle ?? null,
        bullets: p?.bullets ?? [],
        description: p?.description ?? null,
        hasAplus: p?.has_aplus ?? false,
        aplusModules: p?.aplus_modules ?? null,
        isIndependent: p?.is_independent ?? null,
        listingUpdatedAt: p?.listing_updated_at ?? null,
      });
    }
  }

  const { data: mineTracked } = await supabase
    .from('tracked_asins')
    .select('asin, label')
    .eq('is_mine', true);
  const mineAsins = (mineTracked ?? []).map((t) => t.asin);
  const { data: mineProducts } = mineAsins.length
    ? await supabase
        .from('products')
        .select('asin, title, subtitle, bullets, description, has_aplus, aplus_modules')
        .in('asin', mineAsins)
    : { data: [] };
  const mine: MineOption[] = (mineTracked ?? []).map((t) => {
    const p = (mineProducts ?? []).find((x) => x.asin === t.asin);
    return {
      asin: t.asin,
      label: `${t.label ?? p?.title ?? t.asin}`.slice(0, 60),
      title: p?.title ?? t.label ?? null,
      subtitle: p?.subtitle ?? null,
      bullets: p?.bullets ?? [],
      description: p?.description ?? null,
      hasAplus: p?.has_aplus ?? false,
      aplusModules: p?.aplus_modules ?? null,
    };
  });

  return (
    <>
      <PageTitle
        actions={
          <Link href={`/deep-view/${id}`} className="text-sm underline">
            ← Deep View «{keyword}»
          </Link>
        }
      >
        Inserzioni dei concorrenti: «{keyword}»
      </PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Come sono scritte le inserzioni dei primi {rows.length} risultati organici: lunghezza dei
        titoli, descrizioni, contenuto A+, termini ricorrenti e cosa manca alla tua. Il testo delle
        inserzioni viene raccolto quando l&apos;estensione scarica la pagina prodotto (Deep View con
        dettagli, tracking ASIN, visita della pagina).
      </p>
      <ListingAnalysis rows={rows} mine={mine} />
    </>
  );
}
