import { BSR_ANCHORS_IT, type BsrAnchor, type BsrStore } from '../config/bsr-anchors.it';

const MIN_DAILY = 0.003;

/**
 * Stima delle vendite giornaliere da un BSR con interpolazione log-log tra le ancore.
 * Oltre l'ultima ancora estrapola con la pendenza dell'ultimo tratto (con un minimo).
 */
export function estimateDailySales(
  bsr: number | null | undefined,
  store: BsrStore = 'books',
  anchors: Record<BsrStore, BsrAnchor[]> = BSR_ANCHORS_IT,
): number | null {
  if (bsr == null || !Number.isFinite(bsr) || bsr < 1) return null;
  const pts = anchors[store];
  if (!pts || pts.length < 2) return null;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (bsr <= first.bsr) return first.dailySales;

  const interp = (a: BsrAnchor, b: BsrAnchor, x: number) => {
    const t = (Math.log(x) - Math.log(a.bsr)) / (Math.log(b.bsr) - Math.log(a.bsr));
    return Math.exp(Math.log(a.dailySales) + t * (Math.log(b.dailySales) - Math.log(a.dailySales)));
  };

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (bsr <= b.bsr) return interp(a, b, bsr);
  }
  const prev = pts[pts.length - 2]!;
  return Math.max(MIN_DAILY, interp(prev, last, bsr));
}

export function estimateMonthlySales(bsr: number | null | undefined, store: BsrStore = 'books', anchors?: Record<BsrStore, BsrAnchor[]>): number | null {
  const d = estimateDailySales(bsr, store, anchors);
  return d === null ? null : d * 30;
}

export function estimateMonthlyRevenueCents(
  bsr: number | null | undefined,
  priceCents: number | null | undefined,
  store: BsrStore = 'books',
  anchors?: Record<BsrStore, BsrAnchor[]>,
): number | null {
  const m = estimateMonthlySales(bsr, store, anchors);
  if (m === null || priceCents == null) return null;
  return Math.round(m * priceCents);
}

/** Arrotonda una stima a un numero "presentabile" (es. 123.4 → 120, 17.4 → 17, 7.8 → 7.8). */
export function roundEstimate(n: number | null): number | null {
  if (n === null) return null;
  if (n >= 100) return Math.round(n / 10) * 10;
  if (n >= 10) return Math.round(n);
  return Math.round(n * 10) / 10;
}
