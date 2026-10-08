import type { BsrAnchor, BsrStore } from '../config/bsr-anchors.it';
import { SCORE_THRESHOLDS, SCORE_WEIGHTS, type ScoreWeights } from '../config/score-weights';
import { daysSince } from '../locale/it-date';
import type { Product, ProductSnapshotInput } from '../types/product';
import type { SearchResultItem } from '../types/serp';
import { estimateMonthlySales } from './bsr-sales';

export interface NicheScoreBreakdown {
  demand: number;
  competition: number;
  independent: number;
  newEntrants: number;
  price: number;
}

export interface NicheSummary {
  resultCount: number;
  organicCount: number;
  sponsoredCount: number;
  enrichedCount: number;
  independentCount: number;
  independentShare: number | null;
  avgPriceCents: number | null;
  medianPriceCents: number | null;
  avgReviews: number | null;
  medianReviews: number | null;
  lowReviewShare: number | null;
  avgBsr: number | null;
  medianBsr: number | null;
  estMonthlySalesTop10: number | null;
  estMonthlyRevenueTop10Cents: number | null;
  avgAgeDays: number | null;
  newBooksShare: number | null;
  aplusShare: number | null;
  score: number | null;
  breakdown: NicheScoreBreakdown | null;
}

export interface EnrichedData {
  snapshot: ProductSnapshotInput;
  product?: Partial<Product>;
}

export interface SummarizeOptions {
  excludeSponsored?: boolean;
  now?: Date;
  anchors?: Record<BsrStore, BsrAnchor[]>;
  weights?: ScoreWeights;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};
const share = (n: number, d: number) => (d > 0 ? n / d : null);
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

/** Riassume una SERP (eventualmente arricchita con i dati prodotto) in metriche di nicchia. */
export function summarizeNiche(
  items: SearchResultItem[],
  enriched: Map<string, EnrichedData> = new Map(),
  opts: SummarizeOptions = {},
): NicheSummary {
  const now = opts.now ?? new Date();
  const base = opts.excludeSponsored ? items.filter((i) => !i.isSponsored) : items;

  const prices = base.map((i) => i.priceCents).filter((p): p is number => p != null);
  const reviews = base.map((i) => i.reviewsCount).filter((r): r is number => r != null);
  const ages = base
    .map((i) => daysSince(i.pubDate ?? enriched.get(i.asin)?.product?.pubDate ?? null, now))
    .filter((a): a is number => a != null);

  const bsrs: number[] = [];
  let independent = 0;
  let enrichedCount = 0;
  let aplus = 0;
  for (const i of base) {
    const e = enriched.get(i.asin);
    if (!e) continue;
    enrichedCount++;
    if (e.snapshot.bsr != null) bsrs.push(e.snapshot.bsr);
    if (e.product?.isIndependent) independent++;
    if (e.product?.hasAplus) aplus++;
  }

  // Domanda: vendite mensili stimate dei primi 10 organici con BSR
  const top10 = base.filter((i) => !i.isSponsored).slice(0, 10);
  let salesTop10: number | null = null;
  let revenueTop10: number | null = null;
  for (const i of top10) {
    const e = enriched.get(i.asin);
    if (!e || e.snapshot.bsr == null) continue;
    const m = estimateMonthlySales(e.snapshot.bsr, e.snapshot.bsrStore ?? 'books', opts.anchors);
    if (m == null) continue;
    salesTop10 = (salesTop10 ?? 0) + m;
    // Un prezzo 0 (es. "0,00 €" di Kindle Unlimited) non è un prezzo: si prova lo snapshot, altrimenti si salta.
    const price = [i.priceCents, e.snapshot.priceCents].find((p): p is number => p != null && p > 0) ?? null;
    if (price != null) revenueTop10 = (revenueTop10 ?? 0) + m * price;
  }

  const newBooks = base.filter((i) => {
    const d = daysSince(i.pubDate ?? enriched.get(i.asin)?.product?.pubDate ?? null, now);
    return d != null && d <= SCORE_THRESHOLDS.newBookMaxAgeDays;
  }).length;

  const summary: NicheSummary = {
    resultCount: base.length,
    organicCount: base.filter((i) => !i.isSponsored).length,
    sponsoredCount: base.filter((i) => i.isSponsored).length,
    enrichedCount,
    independentCount: independent,
    independentShare: share(independent, enrichedCount),
    avgPriceCents: avg(prices),
    medianPriceCents: median(prices),
    avgReviews: avg(reviews),
    medianReviews: median(reviews),
    lowReviewShare: share(reviews.filter((r) => r <= 20).length, reviews.length),
    avgBsr: avg(bsrs),
    medianBsr: median(bsrs),
    estMonthlySalesTop10: salesTop10,
    estMonthlyRevenueTop10Cents: revenueTop10 == null ? null : Math.round(revenueTop10),
    avgAgeDays: avg(ages),
    newBooksShare: share(newBooks, ages.length),
    aplusShare: share(aplus, enrichedCount),
    score: null,
    breakdown: null,
  };
  const scored = nicheScore(summary, opts.weights);
  summary.score = scored.score;
  summary.breakdown = scored.breakdown;
  return summary;
}

/** Punteggio 0-100: più alto = nicchia più interessante (domanda alta, concorrenza bassa, accessibile). */
export function nicheScore(s: NicheSummary, weights: ScoreWeights = SCORE_WEIGHTS): { score: number | null; breakdown: NicheScoreBreakdown | null } {
  if (s.resultCount === 0) return { score: null, breakdown: null };
  const t = SCORE_THRESHOLDS;

  const demand =
    s.estMonthlySalesTop10 == null ? 0 : clamp((Math.log1p(s.estMonthlySalesTop10) / Math.log1p(t.demandSalesFor100)) * 100);
  const competition =
    s.medianReviews == null ? 50 : clamp(100 - (Math.log1p(s.medianReviews) / Math.log1p(t.reviewsFor0)) * 100);
  const independent = s.independentShare == null ? 50 : clamp(s.independentShare * 100);
  const newEntrants = s.newBooksShare == null ? 30 : clamp(s.newBooksShare * 200);
  const price = s.medianPriceCents == null ? 50 : clamp((s.medianPriceCents / t.priceFor100Cents) * 100);

  const breakdown = { demand, competition, independent, newEntrants, price };
  const total =
    demand * weights.demand +
    competition * weights.competition +
    independent * weights.independent +
    newEntrants * weights.newEntrants +
    price * weights.price;
  const wsum = weights.demand + weights.competition + weights.independent + weights.newEntrants + weights.price;
  return { score: Math.round(clamp(total / wsum)), breakdown };
}

/** Recensioni al giorno dalla pubblicazione: proxy della velocità di vendita. */
export function reviewsPerDay(reviewsCount: number | null | undefined, pubDate: string | null | undefined, now: Date = new Date()): number | null {
  const d = daysSince(pubDate, now);
  if (reviewsCount == null || d == null) return null;
  return reviewsCount / Math.max(1, d);
}
