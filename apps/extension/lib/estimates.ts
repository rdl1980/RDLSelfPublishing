import {
  daysSince,
  estimateDailySales,
  formatEuroCents,
  formatIt,
  printRoyalty,
  roundEstimate,
  type BsrAnchor,
  type BsrStore,
  type ParsedProduct,
} from '@rdl/core';

export interface ProductEstimates {
  monthlySales: number | null;
  monthlyRevenueCents: number | null;
  royaltyCents: number | null;
  monthlyRoyaltyCents: number | null;
  ageDays: number | null;
  reviewsPerDay: number | null;
}

export function computeEstimates(
  product: ParsedProduct['product'],
  snapshot: ParsedProduct['snapshot'],
  anchors: Record<BsrStore, BsrAnchor[]>,
  opts: { ink?: 'bw' | 'premium_color' | 'standard_color' } = {},
): ProductEstimates {
  const daily = estimateDailySales(snapshot.bsr, snapshot.bsrStore ?? (product.format === 'kindle' ? 'kindle' : 'books'), anchors);
  const monthlySales = daily === null ? null : daily * 30;
  const price = snapshot.priceCents;
  const monthlyRevenueCents = monthlySales !== null && price != null ? Math.round(monthlySales * price) : null;
  let royaltyCents: number | null = null;
  if (price != null && product.pageCount && (product.format === 'paperback' || product.format === 'hardcover')) {
    royaltyCents = printRoyalty({ listPriceCents: price, pageCount: product.pageCount, binding: product.format, ink: opts.ink ?? 'bw' }).royaltyCents;
  }
  const ageDays = daysSince(product.pubDate);
  return {
    monthlySales,
    monthlyRevenueCents,
    royaltyCents,
    monthlyRoyaltyCents: royaltyCents !== null && monthlySales !== null ? Math.round(royaltyCents * monthlySales) : null,
    ageDays,
    reviewsPerDay: snapshot.reviewsCount != null && ageDays != null ? snapshot.reviewsCount / Math.max(1, ageDays) : null,
  };
}

export const fmtSales = (n: number | null) => (n === null ? '—' : formatIt(roundEstimate(n) ?? 0, n < 10 ? 1 : 0));
export const fmtEuro = (c: number | null) => (c === null ? '—' : formatEuroCents(c));
export const fmtInt = (n: number | null | undefined) => (n == null ? '—' : formatIt(n));
