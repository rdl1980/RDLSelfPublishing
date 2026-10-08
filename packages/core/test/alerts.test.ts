import { describe, expect, it } from 'vitest';
import { asinAlerts, rankAlerts, resolveAlertThresholds } from '../src/models/alerts';

describe('rankAlerts', () => {
  const kw = 'agenda 2027';
  it('nessun avviso senza rilevazione precedente o sotto soglia', () => {
    expect(rankAlerts(null, { asin: 'A', keyword: kw, position: 5 })).toEqual([]);
    expect(
      rankAlerts({ asin: 'A', keyword: kw, position: 5 }, { asin: 'A', keyword: kw, position: 9 }),
    ).toEqual([]);
  });
  it('perdita e guadagno oltre soglia', () => {
    const drop = rankAlerts(
      { asin: 'A', keyword: kw, position: 5 },
      { asin: 'A', keyword: kw, position: 20 },
    );
    expect(drop[0]!.kind).toBe('rank_drop');
    expect(drop[0]!.severity).toBe('warn');
    expect(drop[0]!.message).toContain('15 posizioni');
    const gain = rankAlerts(
      { asin: 'A', keyword: kw, position: 40 },
      { asin: 'A', keyword: kw, position: 3 },
      undefined,
      'Il mio libro',
    );
    expect(gain[0]!.kind).toBe('rank_gain');
    expect(gain[0]!.message).toContain('«Il mio libro»');
  });
  it('uscita e ingresso nei risultati', () => {
    expect(
      rankAlerts(
        { asin: 'A', keyword: kw, position: 12 },
        { asin: 'A', keyword: kw, position: null },
      )[0]!.kind,
    ).toBe('rank_lost');
    expect(
      rankAlerts(
        { asin: 'A', keyword: kw, position: null },
        { asin: 'A', keyword: kw, position: 12 },
      )[0]!.kind,
    ).toBe('rank_found');
    expect(
      rankAlerts(
        { asin: 'A', keyword: kw, position: null },
        { asin: 'A', keyword: kw, position: null },
      ),
    ).toEqual([]);
  });
  it('soglie personalizzate', () => {
    const t = resolveAlertThresholds({ rankDrop: 3, bsrWorsePct: -1 });
    expect(t.rankDrop).toBe(3);
    expect(t.bsrWorsePct).toBe(0.5); // valore negativo ignorato
    expect(
      rankAlerts(
        { asin: 'A', keyword: kw, position: 5 },
        { asin: 'A', keyword: kw, position: 9 },
        t,
      ),
    ).toHaveLength(1);
  });
});

describe('asinAlerts', () => {
  const prev = { asin: 'B', bsr: 10_000, priceCents: 999, reviewsCount: 20 };
  it('BSR peggiorato e migliorato', () => {
    expect(asinAlerts(prev, { ...prev, bsr: 16_000 })[0]!.kind).toBe('bsr_worse');
    expect(asinAlerts(prev, { ...prev, bsr: 6_000 })[0]!.kind).toBe('bsr_better');
    expect(asinAlerts(prev, { ...prev, bsr: 12_000 })).toEqual([]);
  });
  it('prezzo e recensioni', () => {
    const a = asinAlerts(prev, { ...prev, priceCents: 1299, reviewsCount: 30 });
    expect(a.map((x) => x.kind).sort()).toEqual(['price_change', 'reviews_jump']);
    expect(a.find((x) => x.kind === 'price_change')!.message).toContain('12.99 €');
  });
  it('valori mancanti', () => {
    expect(asinAlerts(null, prev)).toEqual([]);
    expect(
      asinAlerts({ asin: 'B', bsr: null, priceCents: null, reviewsCount: null }, prev),
    ).toEqual([]);
  });
});
