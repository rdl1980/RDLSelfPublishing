import { describe, expect, it } from 'vitest';
import { BSR_ANCHORS_IT, resolveAnchors } from '../src/config/bsr-anchors.it';
import { KDP_EU_CONFIG } from '../src/config/kdp-print-costs.eu';
import { estimateDailySales, estimateMonthlyRevenueCents, roundEstimate } from '../src/models/bsr-sales';
import { nicheScore, reviewsPerDay, summarizeNiche } from '../src/models/niche-score';
import { kindleRoyalty, paperbackRoyalty, printCostCents } from '../src/models/royalty';
import type { SearchResultItem } from '../src/types/serp';

describe('estimateDailySales', () => {
  it('passa per le ancore', () => {
    for (const a of BSR_ANCHORS_IT.books) expect(estimateDailySales(a.bsr, 'books')).toBeCloseTo(a.dailySales, 6);
  });
  it('è monotona decrescente da 1 a 2 milioni', () => {
    let prev = Infinity;
    for (let bsr = 1; bsr <= 2_000_000; bsr = Math.ceil(bsr * 1.37)) {
      const v = estimateDailySales(bsr, 'books')!;
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      expect(v).toBeGreaterThan(0);
      prev = v;
    }
  });
  it('gestisce input non validi', () => {
    expect(estimateDailySales(null)).toBeNull();
    expect(estimateDailySales(0)).toBeNull();
  });
  it('ricavo mensile e arrotondamento', () => {
    expect(estimateMonthlyRevenueCents(5000, 999, 'books')).toBeGreaterThan(0);
    expect(roundEstimate(123.4)).toBe(120);
    expect(roundEstimate(7.8)).toBe(7.8);
    expect(roundEstimate(17.4)).toBe(17);
    expect(roundEstimate(0.44)).toBe(0.4);
  });
  it('override del fattore', () => {
    const custom = resolveAnchors({ factor: { books: 0.24 } });
    expect(estimateDailySales(1000, 'books', custom)).toBeCloseTo(estimateDailySales(1000, 'books')! * 2, 6);
  });
});

describe('royalty', () => {
  it('costo stampa B/N regular 120 pagine = fisso + per pagina (dai valori di config)', () => {
    const r = KDP_EU_CONFIG.paperback.bw.regular;
    const expected = Math.round(r.fixedCents + 120 * r.perPageCents);
    expect(printCostCents({ pageCount: 120 }).cents).toBe(expected);
    // Se qualcuno cambia i numeri di config senza aggiornare il test, questo valore cambia:
    expect(expected).toBe(234);
  });
  it('libro piccolo usa il costo fisso', () => {
    expect(printCostCents({ pageCount: 60 }).cents).toBe(KDP_EU_CONFIG.paperback.bw.regular.smallBookFixedCents);
  });
  it('paperback 9,99 € 120 pagine B/N: IVA scorporata, aliquota 50%, royalty coerente', () => {
    const r = paperbackRoyalty({ listPriceCents: 999, pageCount: 120 });
    expect(r.netPriceCents).toBe(Math.round(999 / 1.04));
    expect(r.royaltyRate).toBe(0.5);
    expect(r.royaltyCents).toBe(Math.round(0.5 * (999 / 1.04) - 234));
    expect(r.warnings).toEqual([]);
    expect(r.breakEvenListPriceCents).toBeGreaterThan(234);
  });
  it('sopra 9,99 € aliquota 60%', () => {
    expect(paperbackRoyalty({ listPriceCents: 1299, pageCount: 120 }).royaltyRate).toBe(0.6);
  });
  it('royalty negativa produce un avviso', () => {
    expect(paperbackRoyalty({ listPriceCents: 299, pageCount: 300 }).warnings.length).toBeGreaterThan(0);
  });
  it('kindle 70% con delivery, e 35% fuori fascia', () => {
    const k = kindleRoyalty({ listPriceCents: 499, fileSizeMb: 2 });
    expect(k.royaltyRate).toBe(0.7);
    expect(k.deliveryCostCents).toBe(24);
    expect(k.royaltyCents).toBe(Math.round(0.7 * (499 / 1.04 - 24)));
    const low = kindleRoyalty({ listPriceCents: 199 });
    expect(low.royaltyRate).toBe(0.35);
    expect(low.warnings.length).toBe(1);
  });
});

function item(partial: Partial<SearchResultItem> & { asin: string; position: number }): SearchResultItem {
  return {
    organicPosition: partial.isSponsored ? null : partial.position,
    isSponsored: false,
    title: 'T',
    author: null,
    pubDate: null,
    format: 'paperback',
    priceCents: 999,
    rating: 4.5,
    reviewsCount: 10,
    imageUrl: null,
    url: null,
    ...partial,
  };
}

describe('summarizeNiche', () => {
  const now = new Date('2026-10-07T00:00:00Z');
  const items = [
    item({ asin: 'A000000001', position: 1, reviewsCount: 5, priceCents: 1299, pubDate: '2026-06-01' }),
    item({ asin: 'A000000002', position: 2, reviewsCount: 50, priceCents: 899, pubDate: '2023-01-01' }),
    item({ asin: 'A000000003', position: 3, isSponsored: true, reviewsCount: 400, priceCents: 1599 }),
  ];
  const enriched = new Map([
    ['A000000001', { snapshot: { asin: 'A000000001', bsr: 5000, bsrStore: 'books' as const, categoryRanks: [], priceCents: 1299, rating: 4.5, reviewsCount: 5, formats: [] }, product: { isIndependent: true, hasAplus: false } }],
    ['A000000002', { snapshot: { asin: 'A000000002', bsr: 50000, bsrStore: 'books' as const, categoryRanks: [], priceCents: 899, rating: 4.5, reviewsCount: 50, formats: [] }, product: { isIndependent: false, hasAplus: true } }],
  ]);

  it('calcola conteggi, medie e quota KDP', () => {
    const s = summarizeNiche(items, enriched, { now });
    expect(s.resultCount).toBe(3);
    expect(s.organicCount).toBe(2);
    expect(s.sponsoredCount).toBe(1);
    expect(s.enrichedCount).toBe(2);
    expect(s.independentShare).toBe(0.5);
    expect(s.medianPriceCents).toBe(1299);
    expect(s.medianReviews).toBe(50);
    expect(s.medianBsr).toBe(27500);
    expect(s.estMonthlySalesTop10).toBeGreaterThan(0);
    expect(s.newBooksShare).toBe(0.5);
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
  it('escludi sponsorizzati', () => {
    const s = summarizeNiche(items, enriched, { now, excludeSponsored: true });
    expect(s.resultCount).toBe(2);
    expect(s.medianReviews).toBe(27.5);
  });
  it('nicheScore su summary vuoto', () => {
    expect(nicheScore(summarizeNiche([], new Map())).score).toBeNull();
  });
  it('reviewsPerDay', () => {
    expect(reviewsPerDay(30, '2026-09-07', now)).toBe(1);
  });
});
