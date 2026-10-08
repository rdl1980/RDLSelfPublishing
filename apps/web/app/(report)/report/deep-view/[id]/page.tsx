import {
  daysSince,
  estimateMonthlySales,
  formatEuroCents,
  formatIt,
  roundEstimate,
  type NicheSummary,
} from '@rdl/core';
import { notFound } from 'next/navigation';
import { NicheSummaryCard } from '@/components/deep-view/NicheSummaryCard';
import { ReportToolbar } from '@/components/report/ReportToolbar';
import { loadDeepViewRows } from '@/lib/db/jobs';
import { anchorsFromSettings, parseProfileSettings } from '@/lib/settings';
import { createClient, getUser } from '@/lib/supabase/server';

/** Report stampabile di un Deep View: riepilogo, tabella dei risultati, keyword dei concorrenti. */
export default async function DeepViewReport({ params }: PageProps<'/report/deep-view/[id]'>) {
  const { id } = await params;
  const user = await getUser();
  const supabase = await createClient();
  const { data: dv } = await supabase
    .from('deep_views')
    .select('*, keyword:keywords(text), job:jobs(id, status)')
    .eq('id', id)
    .maybeSingle();
  if (!dv || !user) notFound();
  const keyword = (dv.keyword as unknown as { text: string } | null)?.text ?? '';
  const job = dv.job as unknown as { id: string; status: string } | null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle();
  const anchors = anchorsFromSettings(parseProfileSettings(profile?.settings));

  const rows: Record<string, unknown>[] = [];
  if (job) {
    const { items, products, snapshots } = await loadDeepViewRows(user.id, job.id);
    for (const it of items) {
      const p = products.get(it.asin);
      const s = snapshots.get(it.asin);
      const monthly = s
        ? estimateMonthlySales(
            s.bsr,
            (s.bsr_store as 'books' | 'kindle' | null) ?? 'books',
            anchors,
          )
        : null;
      const price = it.priceCents ?? s?.price_cents ?? null;
      rows.push({
        position: it.position,
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
        isSponsored: it.isSponsored,
      });
    }
  }

  const { data: runs } = await supabase
    .from('reverse_asin_runs')
    .select('id')
    .eq('deep_view_id', id);
  const runIds = (runs ?? []).map((r) => r.id);
  const { data: results } = runIds.length
    ? await supabase
        .from('reverse_asin_results')
        .select('keyword, asin, found, page, position')
        .in('run_id', runIds)
        .eq('found', true)
    : { data: [] };
  const kwAgg = new Map<string, { found: number; best: number | null }>();
  for (const r of results ?? []) {
    const abs = r.page && r.position ? (r.page - 1) * 48 + r.position : null;
    const cur = kwAgg.get(r.keyword) ?? { found: 0, best: null };
    cur.found++;
    if (abs != null) cur.best = cur.best == null ? abs : Math.min(cur.best, abs);
    kwAgg.set(r.keyword, cur);
  }
  const topKeywords = [...kwAgg.entries()]
    .sort((a, b) => b[1].found - a[1].found || (a[1].best ?? 9999) - (b[1].best ?? 9999))
    .slice(0, 25);
  const summary = dv.summary as unknown as NicheSummary | null;
  const report = {
    keyword,
    alias: dv.alias,
    pages: dv.pages,
    createdAt: dv.created_at,
    summary,
    rows,
    competitorKeywords: topKeywords.map(([k, v]) => ({
      keyword: k,
      booksFound: v.found,
      bestPosition: v.best,
    })),
  };

  const num = (v: unknown) => (v == null ? '—' : formatIt(Number(v)));
  return (
    <>
      <ReportToolbar
        backHref={`/deep-view/${id}`}
        jsonName={`deepview_${keyword.replace(/\W+/g, '_')}.json`}
        json={report}
      />
      <h1 className="text-2xl font-semibold">Deep View: «{keyword}»</h1>
      <p className="mb-4 text-sm text-slate-500">
        amazon.it · catalogo {dv.alias === 'digital-text' ? 'Kindle' : 'Libri'} · {dv.pages} pagine
        di risultati · {new Date(dv.created_at).toLocaleString('it-IT')} · RDL Self Publishing
      </p>
      {summary && <NicheSummaryCard summary={summary} />}

      <h2 className="mt-6 mb-2 text-lg font-semibold">Risultati ({rows.length})</h2>
      <table className="w-full text-[11px]">
        <thead className="border-b border-slate-300 text-left uppercase text-slate-500">
          <tr>
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">Titolo</th>
            <th className="py-1 pr-2">Form.</th>
            <th className="py-1 pr-2 text-right">Prezzo</th>
            <th className="py-1 pr-2 text-right">Rec.</th>
            <th className="py-1 pr-2 text-right">BSR</th>
            <th className="py-1 pr-2 text-right">Vend./mese</th>
            <th className="py-1 pr-2 text-right">Ricavo/mese</th>
            <th className="py-1 pr-2 text-right">Pag.</th>
            <th className="py-1 pr-2">Editore</th>
            <th className="py-1 pr-2">Età</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={`${r.asin}-${r.position}`} className={r.isSponsored ? 'text-slate-400' : ''}>
              <td className="py-0.5 pr-2">{String(r.position)}</td>
              <td className="max-w-xs py-0.5 pr-2">
                <div className="line-clamp-1">{String(r.title ?? r.asin)}</div>
                <div className="text-[9px] text-slate-400">
                  {String(r.asin)}
                  {r.author ? ` · ${String(r.author)}` : ''}
                  {r.isSponsored ? ' · sponsorizzato' : ''}
                </div>
              </td>
              <td className="py-0.5 pr-2">{String(r.format ?? '—')}</td>
              <td className="py-0.5 pr-2 text-right">
                {r.priceCents == null ? '—' : formatEuroCents(Number(r.priceCents))}
              </td>
              <td className="py-0.5 pr-2 text-right">{num(r.reviews)}</td>
              <td className="py-0.5 pr-2 text-right">{num(r.bsr)}</td>
              <td className="py-0.5 pr-2 text-right">
                {r.monthlySales == null
                  ? '—'
                  : formatIt(roundEstimate(Number(r.monthlySales)) ?? 0)}
              </td>
              <td className="py-0.5 pr-2 text-right">
                {r.monthlyRevenueCents == null
                  ? '—'
                  : formatEuroCents(Number(r.monthlyRevenueCents))}
              </td>
              <td className="py-0.5 pr-2 text-right">{num(r.pages)}</td>
              <td className="max-w-[8rem] truncate py-0.5 pr-2">
                {r.isIndependent ? 'KDP' : String(r.publisher ?? '—')}
              </td>
              <td className="py-0.5 pr-2">
                {r.pubDate ? `${daysSince(String(r.pubDate))} gg` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {topKeywords.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-lg font-semibold">Keyword dei concorrenti</h2>
          <table className="w-full max-w-2xl text-[11px]">
            <thead className="border-b border-slate-300 text-left uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-2">Keyword</th>
                <th className="py-1 pr-2 text-right">Libri posizionati</th>
                <th className="py-1 pr-2 text-right">Miglior posizione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topKeywords.map(([k, v]) => (
                <tr key={k}>
                  <td className="py-0.5 pr-2">{k}</td>
                  <td className="py-0.5 pr-2 text-right">{v.found}</td>
                  <td className="py-0.5 pr-2 text-right">{v.best ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="mt-8 text-[10px] text-slate-400">
        Le vendite e i ricavi sono stime dalla curva BSR → vendite calibrata dall&apos;utente; i
        dati provengono dalle pagine pubbliche di amazon.it raccolte dal browser dell&apos;utente.
        Report generato il {new Date().toLocaleString('it-IT')}.
      </p>
    </>
  );
}
