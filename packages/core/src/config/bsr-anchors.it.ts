/**
 * Curva BSR → vendite giornaliere. STIME: le ancore .com derivano da osservazioni pubbliche aggregate
 * (calcolatori di settore) e il mercato italiano è scalato con un fattore. Entrambi sono modificabili
 * dall'utente (Impostazioni → profiles.settings.bsr) e vanno ricalibrati con dati propri (es. i propri
 * libri: BSR osservato vs copie vendute nel report KDP).
 */
export interface BsrAnchor {
  bsr: number;
  dailySales: number;
}

export type BsrStore = 'books' | 'kindle';

export const BSR_ANCHORS_US: Record<BsrStore, BsrAnchor[]> = {
  books: [
    { bsr: 1, dailySales: 3000 },
    { bsr: 10, dailySales: 1200 },
    { bsr: 100, dailySales: 350 },
    { bsr: 1_000, dailySales: 75 },
    { bsr: 5_000, dailySales: 22 },
    { bsr: 10_000, dailySales: 11 },
    { bsr: 50_000, dailySales: 2.5 },
    { bsr: 100_000, dailySales: 1.1 },
    { bsr: 300_000, dailySales: 0.4 },
    { bsr: 1_000_000, dailySales: 0.08 },
    { bsr: 3_000_000, dailySales: 0.02 },
  ],
  kindle: [
    { bsr: 1, dailySales: 4000 },
    { bsr: 10, dailySales: 1500 },
    { bsr: 100, dailySales: 400 },
    { bsr: 1_000, dailySales: 80 },
    { bsr: 5_000, dailySales: 20 },
    { bsr: 10_000, dailySales: 9 },
    { bsr: 50_000, dailySales: 1.5 },
    { bsr: 100_000, dailySales: 0.6 },
    { bsr: 300_000, dailySales: 0.15 },
    { bsr: 1_000_000, dailySales: 0.03 },
  ],
};

/** Rapporto stimato tra il volume di amazon.it e amazon.com (intervallo plausibile 0,10-0,15). */
export const IT_MARKET_FACTOR: Record<BsrStore, number> = { books: 0.12, kindle: 0.1 };

export function scaleAnchors(anchors: BsrAnchor[], factor: number): BsrAnchor[] {
  return anchors.map((a) => ({ bsr: a.bsr, dailySales: a.dailySales * factor }));
}

export const BSR_ANCHORS_IT: Record<BsrStore, BsrAnchor[]> = {
  books: scaleAnchors(BSR_ANCHORS_US.books, IT_MARKET_FACTOR.books),
  kindle: scaleAnchors(BSR_ANCHORS_US.kindle, IT_MARKET_FACTOR.kindle),
};

export interface BsrOverrides {
  /** Fattore moltiplicativo rispetto alle ancore .com (sostituisce IT_MARKET_FACTOR). */
  factor?: Partial<Record<BsrStore, number>>;
  /** Ancore esplicite che sostituiscono del tutto quelle di default per lo store. */
  anchors?: Partial<Record<BsrStore, BsrAnchor[]>>;
}

export function resolveAnchors(overrides?: BsrOverrides | null): Record<BsrStore, BsrAnchor[]> {
  const out: Record<BsrStore, BsrAnchor[]> = { books: BSR_ANCHORS_IT.books, kindle: BSR_ANCHORS_IT.kindle };
  if (!overrides) return out;
  for (const store of ['books', 'kindle'] as const) {
    const custom = overrides.anchors?.[store];
    if (custom && custom.length >= 2) {
      out[store] = [...custom].sort((a, b) => a.bsr - b.bsr);
      continue;
    }
    const f = overrides.factor?.[store];
    if (typeof f === 'number' && f > 0) out[store] = scaleAnchors(BSR_ANCHORS_US[store], f);
  }
  return out;
}
