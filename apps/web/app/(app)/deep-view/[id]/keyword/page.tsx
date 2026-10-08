import { buildSearchUrl, type SearchAlias } from '@rdl/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CompetitorKeywordsTable,
  type CompetitorKeywordRow,
} from '@/components/deep-view/CompetitorKeywordsTable';
import { JobWatcher } from '@/components/jobs/JobWatcher';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

/** Keyword dei concorrenti: aggregato dei Reverse ASIN in massa lanciati da un Deep View. */
export default async function CompetitorKeywordsPage({
  params,
}: PageProps<'/deep-view/[id]/keyword'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: dv }, { data: runs }] = await Promise.all([
    supabase
      .from('deep_views')
      .select('id, alias, keyword:keywords(text)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('reverse_asin_runs')
      .select('id, asin, candidates, created_at, job:jobs(id, status)')
      .eq('deep_view_id', id)
      .order('created_at', { ascending: false }),
  ]);
  if (!dv) notFound();
  const keyword = (dv.keyword as unknown as { text: string } | null)?.text ?? '';
  const runIds = (runs ?? []).map((r) => r.id);

  const { data: results } = runIds.length
    ? await supabase
        .from('reverse_asin_results')
        .select('run_id, keyword, asin, found, page, position, organic_position, total_results_est')
        .in('run_id', runIds)
    : { data: [] };

  // Aggregazione per keyword: quanti libri si posizionano, posizione media, migliore
  const byKw = new Map<string, CompetitorKeywordRow>();
  const asinsAll = new Set<string>();
  for (const r of results ?? []) {
    const row = byKw.get(r.keyword) ?? {
      keyword: r.keyword,
      checked: 0,
      found: 0,
      foundAsins: [],
      bestPosition: null,
      avgPosition: null,
      totalResultsEst: r.total_results_est,
      organicFound: 0,
    };
    const asin = r.asin ?? '';
    if (asin) asinsAll.add(asin);
    row.checked++;
    if (r.found) {
      row.found++;
      const abs = r.page && r.position ? (r.page - 1) * 48 + r.position : null;
      row.foundAsins.push({ asin, position: abs, organic: r.organic_position != null });
      if (r.organic_position != null) row.organicFound++;
      if (abs != null) {
        row.bestPosition = row.bestPosition == null ? abs : Math.min(row.bestPosition, abs);
        const prevSum = (row.avgPosition ?? 0) * (row.foundAsins.length - 1);
        row.avgPosition = (prevSum + abs) / row.foundAsins.length;
      }
    }
    if (row.totalResultsEst == null && r.total_results_est != null)
      row.totalResultsEst = r.total_results_est;
    byKw.set(r.keyword, row);
  }
  const rows = [...byKw.values()].sort(
    (a, b) => b.found - a.found || (a.bestPosition ?? 9999) - (b.bestPosition ?? 9999),
  );
  const { data: products } = asinsAll.size
    ? await supabase
        .from('products')
        .select('asin, title')
        .in('asin', [...asinsAll])
    : { data: [] };
  const titleOf = Object.fromEntries((products ?? []).map((p) => [p.asin, p.title ?? p.asin]));

  const activeJob = (runs ?? [])
    .map((r) => r.job as unknown as { id: string; status: string } | null)
    .find((j) => j && (j.status === 'pending' || j.status === 'running'));
  const pending = (runs ?? []).reduce(
    (acc, r) => acc + ((r.candidates as string[]).length ?? 0),
    0,
  );

  return (
    <>
      <PageTitle
        actions={
          <Link href={`/deep-view/${id}`} className="text-sm underline">
            ← Deep View «{keyword}»
          </Link>
        }
      >
        Keyword dei concorrenti: «{keyword}»
      </PageTitle>
      <p className="mb-3 text-sm text-slate-600">
        Per ogni keyword candidata (dai titoli dei primi libri della nicchia) quanti di quei libri
        compaiono nelle prime pagine di amazon.it. Le keyword condivise da molti concorrenti sono
        quelle che vale la pena usare in titolo, sottotitolo e nei 7 campi KDP.
      </p>
      {activeJob && <JobWatcher jobId={activeJob.id} initialStatus={activeJob.status} />}
      {!runs?.length && (
        <p className="text-sm text-slate-500">
          Nessun Reverse ASIN in massa lanciato per questo Deep View: avvialo dalla pagina del Deep
          View.
        </p>
      )}
      {runs && runs.length > 0 && (
        <p className="my-3 text-xs text-slate-500">
          {runs.length} run · {pending} keyword candidate · {asinsAll.size} libri osservati ·{' '}
          <a
            href={buildSearchUrl(keyword, dv.alias as SearchAlias)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            apri la ricerca su amazon.it ↗
          </a>
        </p>
      )}
      <CompetitorKeywordsTable
        rows={rows}
        titles={titleOf}
        alias={dv.alias as SearchAlias}
        totalBooks={asinsAll.size}
      />
    </>
  );
}
