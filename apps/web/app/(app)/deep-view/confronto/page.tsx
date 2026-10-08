import type { NicheSummary } from '@rdl/core';
import Link from 'next/link';
import { NicheCompareTable, type NicheCompareRow } from '@/components/deep-view/NicheCompareTable';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function NicheComparePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('deep_views')
    .select('id, alias, pages, created_at, summary, keyword:keywords(text)')
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  const rows: NicheCompareRow[] = (data ?? []).map((d) => {
    const s = d.summary as unknown as NicheSummary;
    return {
      id: d.id,
      keyword: (d.keyword as unknown as { text: string } | null)?.text ?? '',
      alias: d.alias,
      pages: d.pages,
      createdAt: d.created_at,
      score: s.score,
      demand: s.breakdown?.demand ?? null,
      competition: s.breakdown?.competition ?? null,
      resultCount: s.resultCount,
      sponsoredCount: s.sponsoredCount,
      independentShare: s.independentShare,
      medianPriceCents: s.medianPriceCents,
      medianReviews: s.medianReviews,
      lowReviewShare: s.lowReviewShare,
      medianBsr: s.medianBsr,
      salesTop10: s.estMonthlySalesTop10,
      revenueTop10Cents: s.estMonthlyRevenueTop10Cents,
      newBooksShare: s.newBooksShare,
      aplusShare: s.aplusShare,
    };
  });

  return (
    <>
      <PageTitle
        actions={
          <Link href="/deep-view" className="text-sm underline">
            ← Deep View
          </Link>
        }
      >
        Confronto nicchie
      </PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Tutte le keyword analizzate con Deep View, una accanto all&apos;altra: ordina per punteggio,
        domanda o concorrenza e decidi dove entrare. Le metriche vengono dal riepilogo calcolato
        alla fine di ogni analisi.
      </p>
      <NicheCompareTable rows={rows} />
    </>
  );
}
