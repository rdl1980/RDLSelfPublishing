import { parseLocaleInt, parsePriceCents, parseRating } from '../locale/it-number';
import { detectFormat, type ProductFormat } from '../locale/labels';
import { isBotChallenge } from './captcha';
import { attr, detectLocale, q, qa, qFirst, text } from './dom';

/** Un elemento della classifica Best Seller / Nuove uscite di una categoria. */
export interface CategoryItem {
  asin: string;
  rank: number;
  title: string | null;
  author: string | null;
  format: ProductFormat | null;
  priceCents: number | null;
  rating: number | null;
  reviewsCount: number | null;
  imageUrl: string | null;
  url: string | null;
}

export interface CategoryPage {
  categoryId: string | null;
  categoryName: string | null;
  kind: 'bestsellers' | 'new_releases';
  page: number;
  items: CategoryItem[];
  locale: 'it' | 'en' | 'unknown';
  isBotChallenge: boolean;
}

export type CategoryStore = 'books' | 'digital-text';
export type CategoryKind = 'bestsellers' | 'new_releases';

const ASIN_RE = /^[A-Z0-9]{10}$/;
const RANK_PER_PAGE = 50;

/** URL della classifica: /gp/bestsellers/books/<id> o /gp/new-releases/books/<id>, pagina 2 con ?pg=2. */
export function buildCategoryUrl(
  categoryId: string,
  kind: CategoryKind = 'bestsellers',
  store: CategoryStore = 'books',
  page = 1,
): string {
  const path = kind === 'bestsellers' ? 'bestsellers' : 'new-releases';
  const u = new URL(`https://www.amazon.it/gp/${path}/${store}/${categoryId}`);
  if (page > 1) u.searchParams.set('pg', String(page));
  return u.toString();
}

/** Id categoria da un URL Amazon (bestsellers, new-releases, node=) o da un id numerico puro. */
export function extractCategoryId(
  input: string,
): { id: string; store: CategoryStore; kind: CategoryKind } | null {
  const s = input.trim();
  if (/^\d{3,}$/.test(s)) return { id: s, store: 'books', kind: 'bestsellers' };
  const m = s.match(/\/(bestsellers|new-releases|movers-and-shakers)\/([a-z-]+)\/(\d+)/i);
  if (m) {
    return {
      id: m[3]!,
      store: m[2]!.toLowerCase() === 'digital-text' ? 'digital-text' : 'books',
      kind: m[1]!.toLowerCase() === 'new-releases' ? 'new_releases' : 'bestsellers',
    };
  }
  const node = s.match(/[?&]node=(\d+)/);
  if (node) return { id: node[1]!, store: 'books', kind: 'bestsellers' };
  return null;
}

function asinOf(card: Element): string | null {
  const direct = attr(card, 'data-asin') ?? attr(card, 'id');
  if (direct && ASIN_RE.test(direct)) return direct;
  const inner = qFirst(card, ['[data-asin]', '.p13n-sc-uncoverable-faceout[id]', '[id^="B0"]']);
  const v = attr(inner, 'data-asin') ?? attr(inner, 'id');
  if (v && ASIN_RE.test(v)) return v;
  const link = qFirst(card, ['a[href*="/dp/"]', 'a[href*="/gp/product/"]']);
  const m = (attr(link, 'href') ?? '').match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  return m ? m[1]! : null;
}

function parseCard(card: Element, index: number, page: number): CategoryItem | null {
  const asin = asinOf(card);
  if (!asin) return null;
  const rankText = text(qFirst(card, ['.zg-bdg-text', '.zg-badge-text', '[class*="zg-bdg"]']));
  const rankParsed = rankText ? parseLocaleInt(rankText.replace('#', '')) : null;
  const rank = rankParsed ?? (page - 1) * RANK_PER_PAGE + index + 1;

  const titleEl = qFirst(card, [
    '[class*="p13n-sc-css-line-clamp"]',
    '.p13n-sc-truncate-desktop-type2',
    '.p13n-sc-truncate',
    '.p13n-sc-truncated',
    'a.a-link-normal span',
  ]);
  const title = text(titleEl) || null;
  const author =
    text(
      qFirst(card, [
        '.a-row.a-size-small > span.a-size-small.a-color-base',
        'span.a-size-small.a-color-base',
        '.a-size-small.a-link-child',
      ]),
    ) || null;
  const priceEl = qFirst(card, [
    '[class*="p13n-sc-price"]',
    '.p13n-sc-price',
    '.a-color-price',
    '.a-price .a-offscreen',
  ]);
  const ratingEl = qFirst(card, [
    '.a-icon-row .a-icon-alt',
    '[aria-label*="stelle"]',
    '[aria-label*="stars"]',
    '.a-icon-alt',
  ]);
  const reviewsEl = qFirst(card, [
    '.a-icon-row a .a-size-small',
    'a[href*="customerReviews"] span',
    'a[title] .a-size-small',
  ]);
  const img = qFirst(card, ['img']);
  const link = qFirst(card, ['a.a-link-normal[href*="/dp/"]', 'a[href*="/dp/"]']);
  const href = attr(link, 'href');
  const formatText = text(qFirst(card, ['.a-size-small.a-color-secondary', 'span.a-text-normal']));

  return {
    asin,
    rank,
    title,
    author: author && author !== title ? author : null,
    format: detectFormat(formatText) ?? detectFormat(text(card).slice(0, 400)),
    priceCents: parsePriceCents(text(priceEl)),
    rating: parseRating(attr(ratingEl, 'aria-label') ?? text(ratingEl)),
    reviewsCount: parseLocaleInt(text(reviewsEl)),
    imageUrl: attr(img, 'src') ?? attr(img, 'data-src'),
    url: href ? (href.startsWith('http') ? href : `https://www.amazon.it${href}`) : null,
  };
}

export function parseCategoryPage(
  doc: Document,
  opts: { categoryId?: string | null; kind?: CategoryKind; page?: number } = {},
): CategoryPage {
  const page = opts.page ?? 1;
  const kind = opts.kind ?? 'bestsellers';
  const cards = qa(
    doc,
    'div[id^="p13n-asin-index-"], .zg-grid-general-faceout, li.zg-item-immersion, .zg-item',
  );
  const items: CategoryItem[] = [];
  const seen = new Set<string>();
  for (const card of cards) {
    const it = parseCard(card, items.length, page);
    if (!it || seen.has(it.asin)) continue;
    seen.add(it.asin);
    items.push(it);
  }
  // Fallback: nessuna card riconosciuta, si cercano le faceout per id ASIN
  if (!items.length) {
    for (const el of qa(doc, '.p13n-sc-uncoverable-faceout[id]')) {
      const it = parseCard(el, items.length, page);
      if (!it || seen.has(it.asin)) continue;
      seen.add(it.asin);
      items.push(it);
    }
  }
  items.sort((a, b) => a.rank - b.rank);

  const banner = text(
    qFirst(doc, ['#zg_banner_text', 'h1.a-size-large', 'h1', '[class*="card-title"]']),
  );
  const categoryName =
    banner
      .replace(
        /^(i più venduti in|best sellers in|nuove uscite in|new releases in|ultime novità in)\s*/i,
        '',
      )
      .trim() || null;
  const idFromUrl =
    attr(q(doc, 'link[rel="canonical"]'), 'href')?.match(
      /\/(?:bestsellers|new-releases)\/[a-z-]+\/(\d+)/i,
    )?.[1] ?? null;

  return {
    categoryId: opts.categoryId ?? idFromUrl,
    categoryName,
    kind,
    page,
    items,
    locale: detectLocale(doc),
    isBotChallenge: isBotChallenge(doc),
  };
}
