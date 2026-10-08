import 'server-only';

import {
  daysSince,
  estimateMonthlySales,
  type BsrAnchor,
  type BsrStore,
  type SerpPayload,
} from '@rdl/core';
import { adminClient } from '@/lib/supabase/admin';

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
};

/**
 * Serie storica giornaliera di una keyword (stagionalità): una riga per giorno con totale risultati,
 * prezzo e recensioni mediane, quota di titoli nuovi e vendite stimate dei top 10 (dagli ultimi snapshot
 * prodotto disponibili). Chiamata ogni volta che arriva la pagina 1 di una SERP, da qualunque fonte.
 */
export async function recordKeywordDailyStats(
  userId: string,
  keywordId: string,
  serp: SerpPayload,
  source: string,
  anchors: Record<BsrStore, BsrAnchor[]>,
): Promise<void> {
  if (serp.page !== 1) return;
  const db = adminClient();
  const organic = serp.items.filter((i) => !i.isSponsored);
  const prices = serp.items.map((i) => i.priceCents).filter((p): p is number => p != null && p > 0);
  const reviews = serp.items.map((i) => i.reviewsCount).filter((r): r is number => r != null);
  const ages = serp.items.map((i) => daysSince(i.pubDate)).filter((d): d is number => d != null);
  const newShare = ages.length ? ages.filter((d) => d <= 365).length / ages.length : null;

  // Vendite stimate dei top 10 organici dagli snapshot più recenti (entro 7 giorni)
  const top10 = organic.slice(0, 10).map((i) => i.asin);
  let top10Sales: number | null = null;
  if (top10.length) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snaps } = await db
      .from('product_snapshots')
      .select('asin, bsr, bsr_store, captured_at')
      .in('asin', top10)
      .gte('captured_at', since)
      .order('captured_at', { ascending: false })
      .limit(top10.length * 5);
    const seen = new Set<string>();
    for (const s of snaps ?? []) {
      if (seen.has(s.asin) || s.bsr == null) continue;
      seen.add(s.asin);
      const m = estimateMonthlySales(s.bsr, (s.bsr_store as BsrStore | null) ?? 'books', anchors);
      if (m != null) top10Sales = (top10Sales ?? 0) + m;
    }
  }

  const day = serp.capturedAt.slice(0, 10);
  const { error } = await db.from('keyword_daily_stats').upsert(
    {
      user_id: userId,
      keyword_id: keywordId,
      alias: serp.alias,
      day,
      total_results_est: serp.totalResultsEst,
      organic_count: organic.length,
      sponsored_count: serp.items.length - organic.length,
      median_price_cents: median(prices),
      median_reviews: median(reviews),
      top10_est_monthly_sales: top10Sales == null ? null : Math.round(top10Sales * 100) / 100,
      new_books_share: newShare == null ? null : Math.round(newShare * 1000) / 1000,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,keyword_id,alias,day' },
  );
  if (error) console.warn('[keyword_daily_stats]', error.message);
}

/** Aggiorna le vendite stimate dei top 10 di oggi con il valore calcolato a fine Deep View (più completo). */
export async function updateKeywordDailySales(
  userId: string,
  keywordId: string,
  alias: string,
  day: string,
  top10Sales: number | null,
): Promise<void> {
  if (top10Sales == null) return;
  await adminClient()
    .from('keyword_daily_stats')
    .update({
      top10_est_monthly_sales: Math.round(top10Sales * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('keyword_id', keywordId)
    .eq('alias', alias)
    .eq('day', day);
}
