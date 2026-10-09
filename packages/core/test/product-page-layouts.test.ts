import { describe, expect, it } from 'vitest';
import { parseProductPage } from '../src/parsers/product-page';
import { loadFixture } from './helpers/load-fixture';

describe('parseProductPage: layout a tabella (cancelleria, Moleskine)', () => {
  const { product, snapshot } = parseProductPage(loadFixture('product-it-B0G41L9ZHY.html'));
  it('legge il rank dello store "Cancelleria" come principale e le categorie', () => {
    expect(product.asin).toBe('B0G41L9ZHY');
    expect(snapshot.bsr).toBe(175);
    expect(snapshot.bsrStore).toBe('books');
    expect(snapshot.categoryRanks).toEqual([
      { id: '4290113031', name: 'Diari per appuntamenti e agende', rank: 8 },
      { id: '14197979031', name: 'Narrativa di genere (Libri)', rank: 216 },
    ]);
    expect(snapshot.priceCents).toBeGreaterThan(0);
    expect(snapshot.reviewsCount).toBeGreaterThan(0);
  });
});

describe('parseProductPage: eBook gratuito ("#150 gratuiti nel negozio Kindle Store")', () => {
  it('non scambia la classifica dei gratuiti né una categoria per il BSR', () => {
    const { product, snapshot } = parseProductPage(loadFixture('product-it-kindle-free-B0GKBS4W4Q.html'));
    expect(product.asin).toBe('B0GKBS4W4Q');
    expect(snapshot.bsr).toBeNull();
    expect(snapshot.bsrStore).toBe('kindle');
    expect(snapshot.categoryRanks).toEqual([
      { id: null, name: 'Gratuiti (Kindle Store)', rank: 150 },
      { id: expect.any(String), name: 'eBook di donne detective dilettanti', rank: 21 },
      { id: expect.any(String), name: 'Letteratura e narrativa (Kindle Store)', rank: 116 },
    ]);
  });
});

describe('parseProductPage: libro senza rank di store (solo categorie)', () => {
  it('Demetra: main null, due categorie con id', () => {
    const { product, snapshot } = parseProductPage(loadFixture('product-it-8844072904.html'));
    expect(product.publisher).toBe('Demetra');
    expect(product.isIndependent).toBe(false);
    expect(product.pageCount).toBe(256);
    expect(snapshot.bsr).toBeNull();
    expect(snapshot.categoryRanks).toEqual([
      { id: '1346639031', name: 'Salute e benessere (Libri)', rank: 1035 },
      { id: '508821031', name: 'Tempo libero (Libri)', rank: 1773 },
    ]);
  });
  it('KDP con categorie strane: main null, categorie lette', () => {
    const { product, snapshot } = parseProductPage(loadFixture('product-it-B0HFQRFS88.html'));
    expect(product.isIndependent).toBe(true);
    expect(product.pageCount).toBe(117);
    expect(snapshot.bsr).toBeNull();
    expect(snapshot.categoryRanks.map((r) => r.name)).toEqual(['Acquisti online', 'Ricerca online']);
    expect(snapshot.priceCents).toBeGreaterThan(0);
  });
});
