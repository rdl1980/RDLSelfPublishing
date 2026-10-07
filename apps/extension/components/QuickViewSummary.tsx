import { formatEuroCents, formatIt, type NicheSummary } from '@rdl/core';
import { fmtSales } from '@/lib/estimates';

export interface SummaryProps {
  keyword: string | null;
  summary: NicheSummary | null;
  loaded: number;
  total: number;
  excludeSponsored: boolean;
  onToggleSponsored: () => void;
  onSync: () => void;
  syncState: 'idle' | 'sending' | 'ok' | 'error' | 'queued';
  connected: boolean | null;
  warning: string | null;
  webUrl: string;
}

function scoreTone(score: number | null): string {
  if (score === null) return 'bg-slate-200 text-slate-700';
  if (score >= 70) return 'bg-green-600 text-white';
  if (score >= 45) return 'bg-amber-500 text-white';
  return 'bg-red-500 text-white';
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export function QuickViewSummary(p: SummaryProps) {
  const s = p.summary;
  return (
    <div className="mb-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 shadow-sm" style={{ fontSize: 13 }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">RDL Self Publishing</span>
        {p.keyword && <span className="text-slate-600">· «{p.keyword}»</span>}
        {s && (
          <span className={`ml-1 rounded px-2 py-0.5 text-xs font-bold ${scoreTone(s.score)}`} title="Punteggio nicchia 0-100: domanda, concorrenza, quota KDP, novità, prezzo">
            nicchia {s.score ?? '—'}/100
          </span>
        )}
        <span className="text-xs text-slate-500">
          dati prodotto {p.loaded}/{p.total}
        </span>
        <label className="ml-auto flex items-center gap-1 text-xs">
          <input type="checkbox" checked={p.excludeSponsored} onChange={p.onToggleSponsored} /> escludi sponsorizzati
        </label>
        <button
          onClick={p.onSync}
          disabled={p.syncState === 'sending' || p.connected === false}
          className="rounded border border-slate-400 bg-white px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-50"
          title={p.connected === false ? 'Estensione non collegata alla web app' : 'Salva questa pagina di risultati nella web app'}
        >
          {p.syncState === 'sending' ? 'Invio…' : p.syncState === 'ok' ? 'Salvata ✓' : p.syncState === 'queued' ? 'In coda' : 'Salva SERP'}
        </button>
        <a href={`${p.webUrl}/keyword`} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">
          web app ↗
        </a>
      </div>
      {p.warning && <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">{p.warning}</div>}
      {s && (
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          <Stat label="Risultati" value={`${s.resultCount}`} hint={`${s.sponsoredCount} sponsor.`} />
          <Stat label="Quota KDP" value={pct(s.independentShare)} hint={`${s.independentCount} su ${s.enrichedCount}`} />
          <Stat label="Prezzo mediano" value={s.medianPriceCents == null ? '—' : formatEuroCents(s.medianPriceCents)} />
          <Stat label="Recens. mediana" value={s.medianReviews == null ? '—' : formatIt(s.medianReviews)} hint={`≤20 rec.: ${pct(s.lowReviewShare)}`} />
          <Stat label="BSR mediano" value={s.medianBsr == null ? '—' : formatIt(Math.round(s.medianBsr))} />
          <Stat label="Vendite/mese top 10" value={fmtSales(s.estMonthlySalesTop10)} hint="stima" />
          <Stat label="Ricavo/mese top 10" value={s.estMonthlyRevenueTop10Cents == null ? '—' : formatEuroCents(s.estMonthlyRevenueTop10Cents)} hint="stima" />
          <Stat label="Nuovi (<1 anno)" value={pct(s.newBooksShare)} hint={`A+: ${pct(s.aplusShare)}`} />
        </div>
      )}
    </div>
  );
}
