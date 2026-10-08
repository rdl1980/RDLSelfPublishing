import { describe, expect, it } from 'vitest';
import { priceTable } from '../src/models/pricing';

describe('priceTable', () => {
  it('cartaceo: pareggio, salto di aliquota a 9,99 €, royalty crescente col prezzo', () => {
    const rows = priceTable({
      mode: 'paperback',
      pageCount: 120,
      targetBsr: 10_000,
      minPriceCents: 499,
      maxPriceCents: 1499,
      stepCents: 50,
    });
    expect(rows).toHaveLength(21);
    const breakEven = rows.find((r) => r.isBreakEven);
    expect(breakEven).toBeDefined();
    expect(breakEven!.royaltyCents).toBeGreaterThan(0);
    const tier = rows.find((r) => r.isTierChange);
    expect(tier!.listPriceCents).toBe(1049);
    expect(tier!.royaltyRate).toBe(0.6);
    for (let i = 1; i < rows.length; i++)
      expect(rows[i]!.royaltyCents).toBeGreaterThanOrEqual(rows[i - 1]!.royaltyCents);
    expect(rows.every((r) => r.monthlySales != null && r.monthlySales > 0)).toBe(true);
    expect(rows[rows.length - 1]!.relativeToBest).toBe(1);
    expect(rows[rows.length - 1]!.monthlyRoyaltyCents).toBe(
      Math.round(rows[rows.length - 1]!.royaltyCents * rows[rows.length - 1]!.monthlySales!),
    );
  });
  it('kindle: 35% fuori dalla fascia 2,99-9,99 e senza BSR niente copie', () => {
    const rows = priceTable({
      mode: 'kindle',
      minPriceCents: 199,
      maxPriceCents: 1199,
      stepCents: 100,
    });
    expect(rows[0]!.royaltyRate).toBe(0.35);
    expect(rows.find((r) => r.listPriceCents === 299)!.royaltyRate).toBe(0.7);
    expect(rows[rows.length - 1]!.royaltyRate).toBe(0.35);
    expect(rows.every((r) => r.monthlySales === null && r.monthlyRoyaltyCents === null)).toBe(true);
  });
});
