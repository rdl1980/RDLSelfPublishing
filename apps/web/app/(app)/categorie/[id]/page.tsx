import { buildCategoryUrl, estimateMonthlySales, type NicheSummary } from '@rdl/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeepViewTable, type DeepViewRow } from '@/components/deep-view/DeepViewTable';
import { NicheSummaryCard } from '@/components/deep-view/NicheSummaryCard';
import { JobWatcher } from '@/components/jobs/JobWatcher';
import { PageTitle } from '@/components/ui';
import { loadCategoryScanRows } from '@/lib/db/categories';
import { anchorsFromSettings, parseProfileSettings } from '@/lib/settings';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function CategoryScanDetail({ params }: PageProps<'/categorie/[id]'>) {
  const { id } = await params;
  const user = await getUser();
  const supabase = await createClient();
  const { data: scan } = await supabase
    .from('category_scans')
    .select('*, job:jobs(id, status, params)')
    .eq('id', id)
    .maybeSingle();
  if (!scan || !user) notFound();
  const job = scan.job as unknown as {
    id: string;
    status: string;
    params: { store?: string };
  } | null;
  const store = job?.params?.store === 'digital-text' ? 'digital-text' : 'books';

  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle();
  const anchors = anchorsFromSettings(parseProfileSettings(profile?.settings));
  const { items, products, snapshots } = await loadCategoryScanRows(
    user.id,
    scan.id,
    job?.id ?? null,
  );

  const rows: DeepViewRow[] = items.map((it) => {
    const p = products.get(it.asin);
    const s = snapshots.get(it.asin);
    const bsrStore = (s?.bsr_store as 'books' | 'kindle' | null) ?? 'books';
    const monthly = s ? estimateMonthlySales(s.bsr, bsrStore, anchors) : null;
    const price = it.price_cents ?? s?.price_cents ?? null;
    return {
      position: it.rank,
      page: Math.ceil(it.rank / 50),
      asin: it.asin,
      title: it.title ?? p?.title ?? null,
      author: it.author ?? p?.authors?.[0] ?? null,
      format: it.format ?? p?.format ?? null,
      priceCents: price,
      rating: it.rating ?? s?.rating ?? null,
      reviews: it.reviews_count ?? s?.reviews_count ?? null,
      bsr: s?.bsr ?? null,
      monthlySales: monthly,
      monthlyRevenueCents: monthly != null && price != null ? Math.round(monthly * price) : null,
      pages: p?.page_count ?? null,
      publisher: p?.publisher ?? null,
      isIndependent: p?.is_independent ?? null,
      pubDate: p?.pub_date ?? null,
      hasAplus: p?.has_aplus ?? null,
      isSponsored: false,
      imageUrl: it.image_url ?? p?.image_url ?? null,
    };
  });
  const kind = scan.kind === 'new_releases' ? 'new_releases' : 'bestsellers';
  const name = scan.category_name ?? `categoria ${scan.category_id}`;

  return (
    <>
      <PageTitle
        actions={
          <span className="flex gap-3 text-sm">
            <a
              href={buildCategoryUrl(scan.category_id, kind, store)}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              classifica su amazon.it ↗
            </a>
            <Link href="/categorie" className="underline">
              ← categorie
            </Link>
          </span>
        }
      >
        {kind === 'new_releases' ? 'Nuove uscite' : 'Best seller'}: {name}
      </PageTitle>
      <p className="mb-3 text-sm text-slate-500">
        id {scan.category_id} · {scan.pages} {scan.pages === 1 ? 'pagina' : 'pagine'} ·{' '}
        {new Date(scan.created_at).toLocaleString('it-IT')}
      </p>
      {job && <JobWatcher jobId={job.id} initialStatus={job.status} />}
      {scan.summary && <NicheSummaryCard summary={scan.summary as unknown as NicheSummary} />}
      <div className="mt-4">
        <DeepViewTable rows={rows} keyword={name} />
      </div>
    </>
  );
}
