import { describe, expect, it } from 'vitest';
import { parseSearchPage } from '../src/parsers/search-page';
import { loadFixture } from './helpers/load-fixture';

describe('parseSearchPage (locale IT)', () => {
  const page = parseSearchPage(loadFixture('search-it-libro-sudoku-p1.html'), { keyword: 'libro sudoku', alias: 'stripbooks' });

  it('riconosce la pagina e il totale risultati', () => {
    expect(page.isBotChallenge).toBe(false);
    expect(page.locale).toBe('it');
    expect(page.totalResultsEst).toBe(50000);
    expect(page.items.length).toBeGreaterThanOrEqual(16);
  });

  it('estrae i campi della prima card', () => {
    const first = page.items.find((i) => i.asin === '362519550X')!;
    expect(first).toBeDefined();
    expect(first.title).toMatch(/Sudoku - Premium Edition/);
    expect(first.priceCents).toBe(873);
    expect(first.rating).toBe(4.6);
    expect(first.reviewsCount).toBe(100);
    expect(first.format).toBe('hardcover');
    expect(first.pubDate).toBe('2024-04-11');
    expect(first.imageUrl).toMatch(/^https:\/\/m\.media-amazon\.com\//);
    expect(first.url).toMatch(/\/dp\/362519550X/);
  });

  it('estrae autore e data da "di Autore | data"', () => {
    const bonfire = page.items.find((i) => i.asin === 'B0CKHTRYS5')!;
    expect(bonfire.author).toBe('Bonfire Publishing');
    expect(bonfire.pubDate).toBe('2023-10-04');
    expect(bonfire.format).toBe('paperback');
    expect(bonfire.priceCents).toBe(799);
    expect(bonfire.reviewsCount).toBe(94);
  });

  it('numera le posizioni e separa gli sponsorizzati', () => {
    expect(page.items.map((i) => i.position)).toEqual(page.items.map((_, idx) => idx + 1));
    const organic = page.items.filter((i) => !i.isSponsored);
    expect(organic.map((i) => i.organicPosition)).toEqual(organic.map((_, idx) => idx + 1));
    expect(page.organicCount + page.sponsoredCount).toBe(page.items.length);
    expect(page.items.filter((i) => i.isSponsored).every((i) => i.organicPosition === null)).toBe(true);
  });

  it('ha prezzo e titolo sulla grande maggioranza delle card', () => {
    const withPrice = page.items.filter((i) => i.priceCents !== null).length;
    const withTitle = page.items.filter((i) => i.title).length;
    expect(withTitle).toBe(page.items.length);
    expect(withPrice / page.items.length).toBeGreaterThan(0.8);
  });
});

describe('parseSearchPage (locale EN)', () => {
  const page = parseSearchPage(loadFixture('search-en-libro-sudoku-p1.html'));

  it('funziona con le etichette inglesi', () => {
    expect(page.locale).toBe('en');
    expect(page.totalResultsEst).toBe(50000);
    const first = page.items.find((i) => i.asin === '362519550X')!;
    expect(first.rating).toBe(4.6);
    expect(first.reviewsCount).toBe(100);
    expect(first.format).toBe('hardcover');
    expect(first.pubDate).toBe('2024-04-11');
    const bonfire = page.items.find((i) => i.asin === 'B0CKHTRYS5')!;
    expect(bonfire.author).toBe('Bonfire Publishing');
  });
});

describe('parseSearchPage pagina 2', () => {
  it('legge anche la seconda pagina', () => {
    const page = parseSearchPage(loadFixture('search-it-libro-sudoku-p2.html'), { page: 2 });
    expect(page.page).toBe(2);
    expect(page.items.length).toBeGreaterThanOrEqual(16);
  });
});
