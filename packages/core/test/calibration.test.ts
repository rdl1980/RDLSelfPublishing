import { describe, expect, it } from 'vitest';
import { BSR_ANCHORS_US, IT_MARKET_FACTOR } from '../src/config/bsr-anchors.it';
import { estimateDailySales } from '../src/models/bsr-sales';
import {
  dailySalesFromPeriod,
  fitMarketFactor,
  impliedFactor,
  isValidCalibrationPoint,
} from '../src/models/calibration';

describe('calibrazione BSR', () => {
  it('un punto esattamente sulla curva .com × fattore di default restituisce il fattore di default', () => {
    const bsr = 5000;
    const base = estimateDailySales(bsr, 'books', BSR_ANCHORS_US)!;
    const fit = fitMarketFactor(
      [{ store: 'books', bsr, dailySales: base * IT_MARKET_FACTOR.books }],
      'books',
    );
    expect(fit.n).toBe(1);
    expect(fit.factor).toBeCloseTo(IT_MARKET_FACTOR.books, 4);
    expect(fit.meanAbsResidual).toBeCloseTo(0, 6);
  });

  it('media geometrica di più punti con fattori diversi', () => {
    const p1 = {
      store: 'books' as const,
      bsr: 1000,
      dailySales: estimateDailySales(1000, 'books', BSR_ANCHORS_US)! * 0.1,
    };
    const p2 = {
      store: 'books' as const,
      bsr: 50_000,
      dailySales: estimateDailySales(50_000, 'books', BSR_ANCHORS_US)! * 0.4,
    };
    const fit = fitMarketFactor([p1, p2], 'books');
    expect(fit.factor).toBeCloseTo(Math.sqrt(0.1 * 0.4), 4);
    expect(fit.points).toHaveLength(2);
    expect(fit.points[0]!.impliedFactor).toBeCloseTo(0.1, 6);
    expect(fit.points[1]!.impliedFactor).toBeCloseTo(0.4, 6);
    // i residui hanno segno opposto: un punto sopra e uno sotto la curva stimata
    expect(fit.points[0]!.residual).toBeLessThan(0);
    expect(fit.points[1]!.residual).toBeGreaterThan(0);
  });

  it('ignora i punti di un altro store e quelli non validi', () => {
    const fit = fitMarketFactor(
      [
        { store: 'kindle', bsr: 1000, dailySales: 5 },
        { store: 'books', bsr: 0, dailySales: 5 },
        { store: 'books', bsr: 1000, dailySales: 0 },
      ],
      'books',
    );
    expect(fit.n).toBe(0);
    expect(fit.factor).toBeNull();
    expect(fitMarketFactor([{ store: 'kindle', bsr: 1000, dailySales: 5 }], 'kindle').n).toBe(1);
  });

  it('helper', () => {
    expect(impliedFactor({ store: 'books', bsr: 1000, dailySales: 7.5 })).toBeCloseTo(7.5 / 75, 6);
    expect(dailySalesFromPeriod(30, 30)).toBe(1);
    expect(dailySalesFromPeriod(30, 0)).toBeNull();
    expect(isValidCalibrationPoint({ store: 'books', bsr: 10, dailySales: 1 })).toBe(true);
    expect(isValidCalibrationPoint({ store: 'books', bsr: 10, dailySales: -1 })).toBe(false);
    expect(isValidCalibrationPoint(null)).toBe(false);
  });
});
