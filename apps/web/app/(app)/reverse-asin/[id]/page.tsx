import { buildSearchUrl, productUrl } from '@rdl/core';
import { notFound } from 'next/navigation';
import { JobWatcher } from '@/components/jobs/JobWatcher';
import { Badge, PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function ReverseAsinDetail({ params }: PageProps<'/reverse-asin/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: run }, { data: results }] = await Promise.all([
    supabase.from('reverse_asin_runs').select('*, job:jobs(id, status, params)').eq('id', id).maybeSingle(),
    supabase.from('reverse_asin_results').select('*').eq('run_id', id).order('found', { ascending: false }).order('page').order('position'),
  ]);
  if (!run) notFound();
  const job = run.job as unknown as { id: string; status: string } | null;
  const { data: product } = await supabase.from('products').select('title').eq('asin', run.asin).maybeSingle();
  const candidates = run.candidates as string[];
  const checked = new Set((results ?? []).map((r) => r.keyword));
  const found = (results ?? []).filter((r) => r.found);
  const multi = new Set((results ?? []).map((r) => r.asin).filter(Boolean)).size > 1;
  const pages = Number((run.job as unknown as { params?: { pages?: number } } | null)?.params?.pages ?? 3);

  return (
    <>
      <PageTitle actions={<a href={productUrl(run.asin)} target="_blank" rel="noreferrer" className="text-sm underline">amazon.it ↗</a>}>
        Reverse ASIN: {run.asin}
      </PageTitle>
      {product?.title && <p className="mb-3 text-sm text-slate-600">{product.title}</p>}
      {job && <JobWatcher jobId={job.id} initialStatus={job.status} />}
      <p className="my-3 text-sm text-slate-500">
        {checked.size}/{candidates.length} keyword verificate · trovato in {new Set(found.map((r) => r.keyword)).size}
        {multi && ` · ${new Set((results ?? []).map((r) => r.asin)).size} libri osservati`}
        {run.deep_view_id && (
          <>
            {' '}
            ·{' '}
            <a href={`/deep-view/${run.deep_view_id}/keyword`} className="underline">
              aggregato per keyword
            </a>
          </>
        )}
      </p>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Keyword</th>
              {multi && <th className="px-3 py-2 text-left">ASIN</th>}
              <th className="px-3 py-2 text-left">Esito</th>
              <th className="px-3 py-2 text-right">Pagina</th>
              <th className="px-3 py-2 text-right">Posizione</th>
              <th className="px-3 py-2 text-right">Organica</th>
              <th className="px-3 py-2 text-right">Risultati totali</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(results ?? []).map((r) => (
              <tr key={r.id} className={r.found ? 'bg-green-50/40' : ''}>
                <td className="px-3 py-1.5">
                  <a href={buildSearchUrl(r.keyword)} target="_blank" rel="noreferrer" className="hover:underline">
                    {r.keyword}
                  </a>
                </td>
                {multi && <td className="px-3 py-1.5 font-mono text-xs">{r.asin ?? run.asin}</td>}
                <td className="px-3 py-1.5">{r.found ? <Badge tone="good">trovato</Badge> : <Badge>non in top {pages * 48}</Badge>}</td>
                <td className="px-3 py-1.5 text-right">{r.page ?? '—'}</td>
                <td className="px-3 py-1.5 text-right">{r.position ?? '—'}</td>
                <td className="px-3 py-1.5 text-right">{r.organic_position ?? (r.found ? 'sponsor.' : '—')}</td>
                <td className="px-3 py-1.5 text-right">{r.total_results_est ?? '—'}</td>
              </tr>
            ))}
            {candidates
              .filter((c) => !checked.has(c))
              .map((c) => (
                <tr key={c} className="text-slate-400">
                  <td className="px-3 py-1.5">{c}</td>
                  <td className="px-3 py-1.5" colSpan={multi ? 6 : 5}>
                    in attesa…
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
