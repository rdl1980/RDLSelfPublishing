import { formatEuroCents, formatIt, roundEstimate, type NicheSummary } from '@rdl/core';
import { Badge, Stat } from '@/components/ui';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export function NicheSummaryCard({ summary: s }: { summary: NicheSummary }) {
  const tone = s.score == null ? 'neutral' : s.score >= 70 ? 'good' : s.score >= 45 ? 'warn' : 'bad';
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">Punteggio nicchia</span>
        <Badge tone={tone}>{s.score ?? '—'}/100</Badge>
        {s.breakdown && (
          <span className="text-xs text-slate-500">
            domanda {Math.round(s.breakdown.demand)} · concorrenza {Math.round(s.breakdown.competition)} · KDP {Math.round(s.breakdown.independent)} · novità{' '}
            {Math.round(s.breakdown.newEntrants)} · prezzo {Math.round(s.breakdown.price)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Stat label="Risultati" value={s.resultCount} hint={`${s.sponsoredCount} sponsorizzati`} />
        <Stat label="Quota KDP" value={pct(s.independentShare)} hint={`${s.independentCount} su ${s.enrichedCount}`} />
        <Stat label="Prezzo mediano" value={s.medianPriceCents == null ? '—' : formatEuroCents(s.medianPriceCents)} />
        <Stat label="Recensioni mediane" value={s.medianReviews == null ? '—' : formatIt(s.medianReviews)} hint={`≤20 rec.: ${pct(s.lowReviewShare)}`} />
        <Stat label="BSR mediano" value={s.medianBsr == null ? '—' : formatIt(Math.round(s.medianBsr))} />
        <Stat label="Vendite/mese top 10" value={s.estMonthlySalesTop10 == null ? '—' : formatIt(roundEstimate(s.estMonthlySalesTop10) ?? 0)} hint="stima" />
        <Stat label="Ricavo/mese top 10" value={s.estMonthlyRevenueTop10Cents == null ? '—' : formatEuroCents(s.estMonthlyRevenueTop10Cents)} hint="stima" />
        <Stat label="Nuovi (<1 anno)" value={pct(s.newBooksShare)} hint={`A+: ${pct(s.aplusShare)}`} />
      </div>
    </div>
  );
}
