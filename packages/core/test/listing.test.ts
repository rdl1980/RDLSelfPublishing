import { describe, expect, it } from 'vitest';
import { listingGaps, listingMetrics, termFrequency } from '../src/models/listing';
import { parseListing } from '../src/parsers/listing';
import { parseProductPage } from '../src/parsers/product-page';
import { loadFixture } from './helpers/load-fixture';

describe('parseListing', () => {
  it('legge descrizione e moduli A+ di un libro KDP', () => {
    const doc = loadFixture('product-it-independent-B0CKHTRYS5.html');
    const l = parseListing(doc);
    expect(l.description).toMatch(/^1000\+ Sudoku per Adulti/);
    expect(l.description!.length).toBeGreaterThan(200);
    expect(l.description).toContain('\n');
    expect(l.aplusModules).toBe(3);
    expect(l.aplusTextLength).toBeGreaterThan(0);
    expect(l.bullets).toEqual([]);
  });
  it('bullet di un articolo di cancelleria', () => {
    const l = parseListing(loadFixture('product-it-B0G41L9ZHY.html'));
    expect(l.bullets.length).toBeGreaterThan(0);
  });
  it('parseProductPage include il contenuto dell’inserzione', () => {
    const { product } = parseProductPage(loadFixture('product-it-independent-B0CKHTRYS5.html'));
    expect(product.description).toMatch(/Sudoku/);
    expect(product.aplusModules).toBe(3);
    expect(product.bullets).toEqual([]);
  });
});

describe('listing metrics e gap', () => {
  const comps = [
    {
      asin: 'A',
      title: 'Agenda 2027 settimanale: planner 12 mesi',
      description: 'Agenda settimanale con calendario e obiettivi mensili',
      hasAplus: true,
      aplusModules: 2,
    },
    {
      asin: 'B',
      title: 'Agenda settimanale 2027 grande formato',
      description: 'Planner con calendario, obiettivi e note',
      hasAplus: false,
    },
    {
      asin: 'C',
      title: 'Planner 2027: agenda settimanale',
      description: 'Calendario annuale e obiettivi',
      hasAplus: true,
      aplusModules: 4,
    },
  ];
  it('metriche', () => {
    const m = listingMetrics(comps[0]!);
    expect(m.titleWords).toBe(6);
    expect(m.hasAplus).toBe(true);
    expect(m.descriptionWords).toBeGreaterThan(3);
  });
  it('termini più frequenti', () => {
    const f = termFrequency(comps.map((c) => `${c.title} ${c.description}`));
    const top = f.slice(0, 5).map((t) => t.term);
    expect(top).toContain('agenda');
    expect(f.find((t) => t.term === 'agenda')!.docs).toBe(3);
    expect(f.some((t) => t.term === 'agenda settimanale')).toBe(true);
  });
  it('gap rispetto alla mia inserzione', () => {
    const gaps = listingGaps(
      { asin: 'M', title: 'Agenda 2027', description: 'La mia agenda' },
      comps,
      { minShare: 0.5 },
    );
    const terms = gaps.map((g) => g.term);
    expect(terms).toContain('settimanale');
    expect(terms).toContain('calendario');
    expect(terms).not.toContain('agenda');
    expect(gaps[0]!.share).toBeGreaterThanOrEqual(0.5);
  });
});
