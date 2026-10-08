import { estimateMonthlySales, type NicheSummary } from '@rdl/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BulkReverseButton } from '@/components/deep-view/BulkReverseButton';
import { DeepViewTable, type DeepViewRow } from '@/components/deep-view/DeepViewTable';
import { JobWatcher } from '@/components/jobs/JobWatcher';
import { NicheSummaryCard } from '@/components/deep-view/NicheSummaryCard';
import { PageTitle } from '@/components/ui';
import { loadDeepViewRows } from '@/lib/db/jobs';
import { anchorsFromSettings, parseProfileSettings } from '@/lib/settings';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function DeepViewDetail({ params }: PageProps<'/deep-view/[id]'>) {
  const { id } = await params;
  const user = await getUser();
  const supabase = await createClient();
  const { data: dv } = await supabase.from('deep_views').select('*, keyword:keywords(text), job:jobs(id, status, progress, error)').eq('id', id).maybeSingle();
  if (!dv || !user) notFound();
  const keyword = (dv.keyword as unknown as { text: string } | null)?.text ?? '';
  const job = dv.job as unknown as { id: string; status: string; progress: unknown; error: string | null } | null;

  const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).maybeSingle();
  const anchors = anchorsFromSettings(parseProfileSettings(profile?.settings));

  const rows: DeepViewRow[] = [];
  if (job) {
    const { items, products, snapshots } = await loadDeepViewRows(user.id, job.id);
    for (const it of items) {
      const p = products.get(it.asin);
      const s = snapshots.get(it.asin);
      const store = (s?.bsr_store as 'books' | 'kindle' | null) ?? 'books';
      const monthly = s ? estimateMonthlySales(s.bsr, store, anchors) : null;
      const price = it.priceCents ?? s?.price_cents ?? null;
      rows.push({
        position: it.position,
        page: it.page,
        asin: it.asin,
        title: it.title ?? p?.title ?? null,
        author: it.author ?? p?.authors?.[0] ?? null,
        format: it.format ?? p?.format ?? null,
        priceCents: price,
        rating: it.rating ?? s?.rating ?? null,
        reviews: it.reviewsCount ?? s?.reviews_count ?? null,
        bsr: s?.bsr ?? null,
        monthlySales: monthly,
        monthlyRevenueCents: monthly != null && price != null ? Math.round(monthly * price) : null,
        pages: p?.page_count ?? null,
        publisher: p?.publisher ?? null,
        isIndependent: p?.is_independent ?? null,
        pubDate: it.pubDate ?? p?.pub_date ?? null,
        hasAplus: p?.has_aplus ?? null,
        isSponsored: it.isSponsored,
        imageUrl: it.imageUrl ?? p?.image_url ?? null,
      });
    }
  }

  return (
    <>
      <PageTitle
        actions={
          <span className="flex gap-3 text-sm">
            <Link href={`/deep-view/${dv.id}/keyword`} className="underline">
              keyword dei concorrenti
            </Link>
            <Link href={`/deep-view/${dv.id}/inserzioni`} className="underline">
              inserzioni
            </Link>
            <Link href="/deep-view/confronto" className="underline">
              confronto nicchie
            </Link>
          </span>
        }
      >
        Deep View: «{keyword}»
      </PageTitle>
      <p className="mb-3 text-sm text-slate-500">
        {dv.alias} · {dv.pages} pagine · {new Date(dv.created_at).toLocaleString('it-IT')}
      </p>
      {job?.status === 'done' && rows.length >= 2 && (
        <div className="mb-3">
          <BulkReverseButton deepViewId={dv.id} />
        </div>
      )}
      {job && <JobWatcher jobId={job.id} initialStatus={job.status} />}
      {dv.summary && <NicheSummaryCard summary={dv.summary as unknown as NicheSummary} />}
      <div className="mt-4">
        <DeepViewTable rows={rows} keyword={keyword} />
      </div>
    </>
  );
}
