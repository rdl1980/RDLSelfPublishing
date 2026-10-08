import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { nextCategoryScanStep } from '../src/jobs/planners';
import {
  buildCategoryUrl,
  extractCategoryId,
  parseCategoryPage,
} from '../src/parsers/category-page';

/** Struttura minima della griglia Best Seller di amazon.it (layout p13n 2024-2026). */
const GRID = `<!doctype html><html lang="it-it"><head><link rel="canonical" href="https://www.amazon.it/gp/bestsellers/books/4290113031"/></head><body>
<div id="zg_banner_text">I più venduti in Diari per appuntamenti e agende</div>
<div id="gridItemRoot">
  <div id="p13n-asin-index-0" class="a-cardui">
    <div class="p13n-sc-uncoverable-faceout" id="B0CKHTRYS5">
      <span class="zg-bdg-text">#1</span>
      <a class="a-link-normal" href="/dp/B0CKHTRYS5/ref=zg_bs"><img src="https://m.media-amazon.com/images/I/1.jpg"/></a>
      <a class="a-link-normal" href="/dp/B0CKHTRYS5"><span><div class="_cDEzb_p13n-sc-css-line-clamp-1_1Fn1y">Agenda 2027 Settimanale: Planner</div></span></a>
      <div class="a-row a-size-small"><span class="a-size-small a-color-base">Rossi Editore</span></div>
      <div class="a-icon-row"><a href="/product-reviews/B0CKHTRYS5#customerReviews"><i class="a-icon-star-small"><span class="a-icon-alt">4,6 su 5 stelle</span></i><span class="a-size-small">1.234</span></a></div>
      <div class="a-row"><span class="a-size-small a-color-secondary">Copertina flessibile</span></div>
      <div class="a-row"><span class="_cDEzb_p13n-sc-price_3mJ9Z">12,90 €</span></div>
    </div>
  </div>
  <div id="p13n-asin-index-1" class="a-cardui">
    <div class="p13n-sc-uncoverable-faceout" id="B0G41L9ZHY">
      <span class="zg-bdg-text">#2</span>
      <a class="a-link-normal" href="/dp/B0G41L9ZHY"><span><div class="_cDEzb_p13n-sc-css-line-clamp-3_g3dy1">Agenda 2027 giornaliera Moleskine</div></span></a>
      <div class="a-row"><span class="p13n-sc-price">21,00 €</span></div>
    </div>
  </div>
</div></body></html>`;

describe('parseCategoryPage', () => {
  it('legge griglia, rank, titolo, autore, prezzo, rating e recensioni', () => {
    const { document } = parseHTML(GRID);
    const page = parseCategoryPage(document as unknown as Document, {
      kind: 'bestsellers',
      page: 1,
    });
    expect(page.isBotChallenge).toBe(false);
    expect(page.categoryId).toBe('4290113031');
    expect(page.categoryName).toBe('Diari per appuntamenti e agende');
    expect(page.items).toHaveLength(2);
    const [a, b] = page.items;
    expect(a!.asin).toBe('B0CKHTRYS5');
    expect(a!.rank).toBe(1);
    expect(a!.title).toMatch(/^Agenda 2027 Settimanale/);
    expect(a!.author).toBe('Rossi Editore');
    expect(a!.priceCents).toBe(1290);
    expect(a!.rating).toBe(4.6);
    expect(a!.reviewsCount).toBe(1234);
    expect(a!.format).toBe('paperback');
    expect(a!.url).toMatch(/\/dp\/B0CKHTRYS5/);
    expect(b!.rank).toBe(2);
    expect(b!.priceCents).toBe(2100);
    expect(b!.rating).toBeNull();
  });
  it('rank di fallback per la pagina 2 senza badge', () => {
    const { document } = parseHTML(GRID.replace(/<span class="zg-bdg-text">#\d<\/span>/g, ''));
    const page = parseCategoryPage(document as unknown as Document, { page: 2 });
    expect(page.items.map((i) => i.rank)).toEqual([51, 52]);
  });
});

describe('url e id categoria', () => {
  it('buildCategoryUrl', () => {
    expect(buildCategoryUrl('4290113031')).toBe(
      'https://www.amazon.it/gp/bestsellers/books/4290113031',
    );
    expect(buildCategoryUrl('123', 'new_releases', 'digital-text', 2)).toBe(
      'https://www.amazon.it/gp/new-releases/digital-text/123?pg=2',
    );
  });
  it('extractCategoryId', () => {
    expect(extractCategoryId('4290113031')).toEqual({
      id: '4290113031',
      store: 'books',
      kind: 'bestsellers',
    });
    expect(
      extractCategoryId('https://www.amazon.it/gp/new-releases/digital-text/827133031/ref=zg_bsnr'),
    ).toEqual({ id: '827133031', store: 'digital-text', kind: 'new_releases' });
    expect(extractCategoryId('https://www.amazon.it/s?node=508869031')).toEqual({
      id: '508869031',
      store: 'books',
      kind: 'bestsellers',
    });
    expect(extractCategoryId('agenda')).toBeNull();
  });
});

describe('nextCategoryScanStep', () => {
  it('pagine, poi arricchimento, poi fine', () => {
    const params = { pages: 2, enrich: true, maxAsins: 100 };
    expect(nextCategoryScanStep({ pagesDone: [], asins: [], enriched: [] }, params)).toEqual({
      kind: 'pages',
      pages: [1, 2],
    });
    const s = { pagesDone: [1, 2], asins: ['B0CKHTRYS5', 'B0G41L9ZHY'], enriched: [] };
    expect(nextCategoryScanStep(s, params)).toEqual({
      kind: 'enrich',
      asins: ['B0CKHTRYS5', 'B0G41L9ZHY'],
    });
    expect(nextCategoryScanStep({ ...s, enriched: s.asins }, params)).toEqual({ kind: 'done' });
    expect(nextCategoryScanStep(s, { ...params, enrich: false })).toEqual({ kind: 'done' });
  });
});
