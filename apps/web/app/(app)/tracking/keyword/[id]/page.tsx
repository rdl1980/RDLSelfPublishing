import { buildSearchUrl, type SearchAlias } from '@rdl/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RankChart, type RankPoint } from '@/components/tracking/charts/RankChart';
import { Badge, Card, PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function TrackedKeywordPage({ params }: PageProps<'/tracking/keyword/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: tk }, { data: snaps }] = await Promise.all([
    supabase.from('tracked_keywords').select('*, keyword:keywords(text)').eq('id', id).maybeSingle(),
    supabase.from('keyword_rank_snapshots').select('asin, captured_at, found, page, position, absolute_position, is_sponsored').eq('tracked_keyword_id', id).order('captured_at'),
  ]);
  if (!tk) notFound();
  const keyword = (tk.keyword as unknown as { text: string } | null)?.text ?? '';
  const asins = tk.watch_asins;
  const { data: products } = asins.length ? await supabase.from('products').select('asin, title').in('asin', asins) : { data: [] };
  const titleOf = new Map((products ?? []).map((p) => [p.asin, p.title]));

  // Un punto per giorno
  const byDay = new Map<string, RankPoint>();
  for (const s of snaps ?? []) {
    const day = s.captured_at.slice(0, 10);
    const pt = byDay.get(day) ?? { date: day };
    pt[s.asin] = s.found ? s.absolute_position : null;
    byDay.set(day, pt);
  }
  const data = Array.from(byDay.values());
  const latest = new Map<string, (typeof snaps extends (infer T)[] | null ? T : never)>();
  for (const s of snaps ?? []) latest.set(s.asin, s);

  return (
    <>
      <PageTitle actions={<Link href="/tracking/keyword" className="text-sm underline">← tutte le keyword</Link>}>Tracking: «{keyword}»</PageTitle>
      <p className="mb-4 text-sm text-slate-500">
        <a href={buildSearchUrl(keyword, tk.alias as SearchAlias)} target="_blank" rel="noreferrer" className="underline">
          apri su amazon.it ↗
        </a>{' '}
        · {tk.pages} pagine · ultimo run {tk.last_run_at ? new Date(tk.last_run_at).toLocaleString('it-IT') : 'mai'}
      </p>
      {asins.length === 0 && <Card>Aggiungi gli ASIN da osservare dalla lista delle keyword tracciate.</Card>}
      {asins.length > 0 && (
        <>
          <Card>
            <h3 className="mb-2 text-sm font-semibold">Posizione assoluta nel tempo</h3>
            {data.length ? <RankChart data={data} asins={asins} maxPosition={tk.pages * 48} /> : <p className="text-sm text-slate-400">Nessuna rilevazione ancora.</p>}
          </Card>
          <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">ASIN</th>
                  <th className="px-3 py-2 text-left">Titolo</th>
                  <th className="px-3 py-2 text-right">Ultima posizione</th>
                  <th className="px-3 py-2 text-right">Pagina</th>
                  <th className="px-3 py-2 text-left">Rilevato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asins.map((a) => {
                  const l = latest.get(a);
                  return (
                    <tr key={a}>
                      <td className="px-3 py-1.5 font-mono text-xs">
                        <Link href={`/prodotti/${a}`} className="hover:underline">
                          {a}
                        </Link>
                      </td>
                      <td className="max-w-md truncate px-3 py-1.5">{titleOf.get(a) ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        {l ? l.found ? <>{l.absolute_position} {l.is_sponsored && <Badge tone="warn">sponsor</Badge>}</> : <Badge>non trovato</Badge> : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right">{l?.page ?? '—'}</td>
                      <td className="px-3 py-1.5 text-slate-500">{l ? new Date(l.captured_at).toLocaleString('it-IT') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
