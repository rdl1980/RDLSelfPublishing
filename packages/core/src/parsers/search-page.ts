import { parseLocaleDate } from '../locale/it-date';
import { parseLocaleInt, parsePriceCents, parseRating } from '../locale/it-number';
import { detectFormat, SPONSORED_RE, type ProductFormat } from '../locale/labels';
import type { SearchResultItem, SerpPage } from '../types/serp';
import { isBotChallenge } from './captcha';
import { attr, detectLocale, q, qa, qFirst, text } from './dom';

const RESULTS_RE =
  /(?:dei più di|di oltre|di più di|di|of over|of more than|of)\s+([\d.,]+)\s+(?:risultati|results)/i;

function cardIsSponsored(card: Element): boolean {
  if (q(card, '.puis-sponsored-label-text, .s-sponsored-label-text, [data-component-type="sp-sponsored-result"]'))
    return true;
  // Fallback: uno span breve che dice solo "Sponsorizzato"/"Sponsored"
  return qa(card, 'span').some((s) => {
    const t = text(s);
    return t.length < 20 && SPONSORED_RE.test(t);
  });
}

function parseMetaRow(card: Element): { author: string | null; pubDate: string | null; edition: string | null } {
  // Riga sotto il titolo: "di Autore | 4 ott 2023" oppure "Edizione Tedesco | 11 apr. 2024"
  const rows = qa(card, '[data-cy="title-recipe"] .a-row.a-color-secondary, .a-row.a-size-base.a-color-secondary');
  let author: string | null = null;
  let pubDate: string | null = null;
  let edition: string | null = null;
  for (const row of rows) {
    const t = text(row);
    if (!t) continue;
    const parts = t.split('|').map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const d = parseLocaleDate(p);
      if (d && !pubDate) {
        pubDate = d;
        continue;
      }
      const m = p.match(/^(?:di|by)\s+(.+)$/i);
      if (m && !author) {
        author = m[1]!.replace(/\s*(,\s*)?(et al\.?|e altri|and others)\s*$/i, '').trim();
        continue;
      }
      if (/^(edizione|edition)/i.test(p) || /(edizione|edition)$/i.test(p)) edition = p;
    }
    if (author || pubDate) break;
  }
  return { author, pubDate, edition };
}

function parseFormat(card: Element, title: string | null): ProductFormat | null {
  const candidates = [
    ...qa(card, 'a.a-text-bold'),
    ...qa(card, '.a-size-base.a-color-secondary.a-text-normal'),
    ...qa(card, '[data-cy="secondary-offer-recipe"]'),
  ];
  for (const el of candidates) {
    const f = detectFormat(text(el));
    if (f) return f;
  }
  // Ultimo tentativo: testo della card escluso il titolo
  const body = text(card).replace(title ?? '', '');
  return detectFormat(body);
}

export function parseSearchCard(card: Element, position: number): SearchResultItem | null {
  const asin = attr(card, 'data-asin');
  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) return null;

  const h2 = q(card, 'h2');
  const title = attr(h2, 'aria-label') ?? (h2 ? text(h2) : null);
  const link = qFirst(card, ['h2 a', 'a.a-link-normal.s-no-outline', 'a.a-link-normal[href*="/dp/"]']);
  const href = attr(link, 'href');

  const ratingEl = qFirst(card, [
    '[data-cy="reviews-block"] [aria-label*="stelle"]',
    '[data-cy="reviews-block"] [aria-label*="stars"]',
    '[aria-label*="su 5 stelle"]',
    '[aria-label*="out of 5 stars"]',
    'i.a-icon-star-small span',
    'i.a-icon-star span',
  ]);
  const rating = parseRating(attr(ratingEl, 'aria-label') ?? text(ratingEl));

  const reviewsEl = qFirst(card, [
    '[data-cy="reviews-block"] [aria-label$="valutazioni"]',
    '[data-cy="reviews-block"] [aria-label$="ratings"]',
    '[aria-label$="valutazioni"]',
    '[aria-label$="ratings"]',
    'a[href*="#customerReviews"] span',
  ]);
  const reviewsCount = parseLocaleInt(attr(reviewsEl, 'aria-label') ?? text(reviewsEl));

  const priceEl = qFirst(card, ['[data-cy="price-recipe"] .a-price .a-offscreen', '.a-price .a-offscreen']);
  const priceCents = parsePriceCents(text(priceEl));

  const img = q(card, 'img.s-image');
  const { author, pubDate } = parseMetaRow(card);

  return {
    asin,
    position,
    organicPosition: null,
    isSponsored: cardIsSponsored(card),
    title,
    author,
    pubDate,
    format: parseFormat(card, title),
    priceCents,
    rating,
    reviewsCount,
    imageUrl: attr(img, 'src'),
    url: href ? (href.startsWith('http') ? href : `https://www.amazon.it${href}`) : null,
  };
}

export interface ParseSearchOptions {
  keyword?: string | null;
  alias?: string | null;
  page?: number;
}

export function parseSearchPage(doc: Document, opts: ParseSearchOptions = {}): SerpPage {
  const bot = isBotChallenge(doc);
  const cards = qa(doc, 'div[data-component-type="s-search-result"][data-asin], div.s-result-item[data-asin]').filter(
    (c, i, arr) => attr(c, 'data-asin') && arr.indexOf(c) === i,
  );

  const items: SearchResultItem[] = [];
  let organic = 0;
  for (const card of cards) {
    const item = parseSearchCard(card, items.length + 1);
    if (!item) continue;
    if (!item.isSponsored) item.organicPosition = ++organic;
    items.push(item);
  }

  const infoEl = qFirst(doc, ['[data-component-type="s-result-info-bar"]', '.s-breadcrumb', '#s-result-count']);
  const infoText = text(infoEl);
  const m = infoText.match(RESULTS_RE);
  const totalResultsEst = m ? parseLocaleInt(m[1]) : null;

  return {
    keyword: opts.keyword ?? attr(q(doc, 'input#twotabsearchtextbox'), 'value') ?? null,
    alias: opts.alias ?? null,
    page: opts.page ?? 1,
    items,
    totalResultsText: m ? m[0] : null,
    totalResultsEst,
    organicCount: organic,
    sponsoredCount: items.length - organic,
    locale: detectLocale(doc),
    isBotChallenge: bot,
  };
}
