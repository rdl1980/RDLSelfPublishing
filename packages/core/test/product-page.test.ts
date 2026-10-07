import { describe, expect, it } from 'vitest';
import { parseBsrText } from '../src/parsers/bsr';
import { parseProductPage } from '../src/parsers/product-page';
import { loadFixture } from './helpers/load-fixture';

describe('parseBsrText', () => {
  it('testo italiano con categorie', () => {
    const r = parseBsrText(
      'n. 5.432 in Libri (Visualizza i Top 100 nella categoria Libri) n. 20 in Giochi di società n. 61 in Matematica divulgativa',
    );
    expect(r.main).toBe(5432);
    expect(r.store).toBe('books');
    expect(r.ranks).toEqual([
      { id: null, name: 'Giochi di società', rank: 20 },
      { id: null, name: 'Matematica divulgativa', rank: 61 },
    ]);
  });
  it('testo inglese', () => {
    const r = parseBsrText('5,432 in Books (See Top 100 in Books) 20 in Party Games 61 in Popular Mathematics');
    expect(r.main).toBe(5432);
    expect(r.ranks.map((x) => x.rank)).toEqual([20, 61]);
  });
  it('kindle store', () => {
    const r = parseBsrText('n. 1.200 in Kindle Store (Visualizza i Top 100 nella categoria Kindle Store) n. 3 in Gialli');
    expect(r.store).toBe('kindle');
    expect(r.main).toBe(1200);
  });
});

describe('parseProductPage (KDP indipendente, locale IT)', () => {
  const { product, snapshot, locale, isBotChallenge } = parseProductPage(loadFixture('product-it-independent-B0CKHTRYS5.html'));

  it('metadati stabili', () => {
    expect(isBotChallenge).toBe(false);
    expect(locale).toBe('it');
    expect(product.asin).toBe('B0CKHTRYS5');
    expect(product.title).toMatch(/^1000\+ Sudoku per Adulti/);
    expect(product.authors).toEqual(['Bonfire Publishing']);
    expect(product.publisher).toBe('Independently published');
    expect(product.isIndependent).toBe(true);
    expect(product.pubDate).toBe('2023-10-04');
    expect(product.language).toMatch(/Italiano/i);
    expect(product.pageCount).toBe(170);
    expect(product.isbn13).toBe('979-8862660791');
    expect(product.dimensions).toMatch(/15\.54 x 0\.99 x 22\.86 cm/);
    expect(product.format).toBe('paperback');
    expect(product.imageUrl).toMatch(/^https:\/\/m\.media-amazon\.com\//);
    expect(product.categories.map((c) => c.id)).toEqual(['90130494031', '508869031']);
  });

  it('snapshot variabile', () => {
    expect(snapshot.bsr).toBe(5432);
    expect(snapshot.bsrStore).toBe('books');
    expect(snapshot.categoryRanks).toEqual([
      { id: '90130494031', name: 'Giochi per feste', rank: 20 },
      { id: '508869031', name: 'Matematica (Libri)', rank: 61 },
    ]);
    expect(snapshot.priceCents).toBe(799);
    expect(snapshot.rating).toBe(4.6);
    expect(snapshot.reviewsCount).toBe(94);
    expect(snapshot.formats.some((f) => f.format === 'paperback' && f.priceCents === 799)).toBe(true);
  });
});

describe('parseProductPage (locale EN)', () => {
  it('stessi dati con etichette inglesi', () => {
    const { product, snapshot } = parseProductPage(loadFixture('product-en-independent-B0CKHTRYS5.html'));
    expect(product.publisher).toBe('Independently published');
    expect(product.isIndependent).toBe(true);
    expect(product.pubDate).toBe('2023-10-04');
    expect(product.pageCount).toBe(170);
    expect(snapshot.bsr).toBe(5432);
    expect(snapshot.bsrStore).toBe('books');
    expect(snapshot.categoryRanks.map((r) => r.rank)).toEqual([20, 61]);
    expect(snapshot.reviewsCount).toBe(94);
  });
});

describe('parseProductPage (editore tradizionale)', () => {
  it('riconosce un editore non KDP', () => {
    const { product, snapshot } = parseProductPage(loadFixture('product-it-publisher-B0GXH5YXTN.html'));
    expect(product.asin).toBe('B0GXH5YXTN');
    expect(product.publisher).toBeTruthy();
    expect(product.isIndependent).toBe(false);
    expect(product.pubDate).toBe('2026-06-02');
    expect(snapshot.bsr).toBeGreaterThan(0);
    expect(snapshot.reviewsCount).toBeGreaterThanOrEqual(400);
  });
});
