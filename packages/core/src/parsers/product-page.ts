import { parseLocaleDate } from '../locale/it-date';
import { parseLocaleInt, parsePriceCents, parseRating } from '../locale/it-number';
import {
  detailKeyFor,
  detectFormat,
  INDEPENDENT_PUBLISHER_RE,
  type DetailKey,
  type ProductFormat,
} from '../locale/labels';
import type { CategoryRank, FormatOffer, ParsedProduct, Product, ProductSnapshotInput } from '../types/product';
import { categoryIdFromHref, parseBsrText, type BsrInfo } from './bsr';
import { isBotChallenge } from './captcha';
import { attr, detectLocale, q, qa, qFirst, text } from './dom';

interface DetailEntry {
  key: DetailKey;
  value: string;
  element: Element;
}

/** Legge i "Dettagli prodotto" sia nel formato a elenco (li) sia nel formato tabella (tr th/td). */
function readDetails(doc: Document): DetailEntry[] {
  const out: DetailEntry[] = [];

  for (const li of qa(doc, '#detailBulletsWrapper_feature_div li, #detailBullets_feature_div li')) {
    const label = q(li, 'span.a-text-bold');
    if (!label) continue;
    const key = detailKeyFor(text(label));
    if (!key) continue;
    // Il valore è il testo del li senza l'etichetta (per il BSR include i rank annidati).
    const value = text(li).replace(text(label), '').trim();
    out.push({ key, value, element: li });
  }

  for (const tr of qa(doc, '#productDetails_detailBullets_sections1 tr, #productDetails_techSpec_section_1 tr, #productDetailsTable tr')) {
    const th = q(tr, 'th');
    const td = q(tr, 'td');
    if (!th || !td) continue;
    const key = detailKeyFor(text(th));
    if (!key) continue;
    out.push({ key, value: text(td), element: tr });
  }
  return out;
}

function parseFormats(doc: Document): FormatOffer[] {
  const swatches = qa(doc, '#tmmSwatches .swatchElement, #tmmSwatches [id^="tmm-grid-swatch-"]');
  const offers: FormatOffer[] = [];
  for (const sw of swatches) {
    const label = text(qFirst(sw, ['.slot-title', 'a.a-button-text span', '.a-button-text', 'span']));
    const whole = text(sw);
    const format = detectFormat(label) ?? detectFormat(whole) ?? detectFormat(attr(sw, 'id'));
    if (!format) continue;
    const priceEl = qFirst(sw, ['.slot-price', '.a-color-price', '.a-price .a-offscreen', '.a-size-base.a-color-price']);
    const priceCents = parsePriceCents(text(priceEl));
    const selected =
      (attr(sw, 'class') ?? '').includes('selected') ||
      (attr(sw, 'class') ?? '').includes('unselected') === false && !!q(sw, '.a-button-selected');
    offers.push({ format, label: label || whole.slice(0, 40), priceCents, selected });
  }
  return offers;
}

function parseAuthors(doc: Document): string[] {
  const byline = q(doc, '#bylineInfo');
  if (!byline) return [];
  const names = qa(byline, 'a.contributorNameID, .author a.a-link-normal, a.a-link-normal')
    .map((a) => text(a))
    .filter((t) => t && !/^\(.*\)$/.test(t) && !/visita|visit/i.test(t));
  const unique = Array.from(new Set(names));
  if (unique.length) return unique;
  const t = text(byline).replace(/^(di|by)\s+/i, '').replace(/\(.*?\)/g, '').trim();
  return t ? [t] : [];
}

function parseImage(doc: Document): string | null {
  const img = qFirst(doc, ['#landingImage', '#imgTagWrapperId img', '#ebooksImgBlkFront', '#imgBlkFront', '#main-image']);
  if (!img) return null;
  const src = attr(img, 'src');
  if (src && !src.startsWith('data:')) return src;
  const dyn = attr(img, 'data-a-dynamic-image') ?? attr(img, 'data-old-hires');
  if (dyn) {
    const m = dyn.match(/https:[^"\\]+/);
    if (m) return m[0];
  }
  return src;
}

/**
 * Rank Bestseller: preferisce la struttura DOM (lista annidata ul.zg_hrsr con un link per categoria),
 * con fallback sul parsing del testo quando la struttura cambia.
 */
function parseBsrEntry(entry: DetailEntry | undefined): BsrInfo {
  if (!entry) return { main: null, store: null, ranks: [] };
  const fromText = parseBsrText(entry.value);

  const nested = qa(entry.element, 'ul li');
  const ranks: CategoryRank[] = [];
  for (const li of nested) {
    const a = q(li, 'a[href*="/gp/bestsellers/"]');
    const rank = parseLocaleInt(text(li));
    const name = text(a);
    if (!a || rank === null || !name) continue;
    ranks.push({ id: categoryIdFromHref(attr(a, 'href')), name, rank });
  }
  return { main: fromText.main, store: fromText.store, ranks: ranks.length ? ranks : fromText.ranks };
}

function hasAplusContent(doc: Document): boolean {
  return qa(doc, '#aplus, #aplus_feature_div, [id^="aplus"]').some((el) => text(el).length > 50);
}

export function parseProductPage(doc: Document, hints: { asin?: string | null } = {}): ParsedProduct {
  const bot = isBotChallenge(doc);
  const details = readDetails(doc);
  const get = (key: DetailKey) => details.find((d) => d.key === key)?.value ?? null;

  const asinFromPage =
    get('asin')?.match(/[A-Z0-9]{10}/)?.[0] ??
    attr(q(doc, 'input#ASIN'), 'value') ??
    attr(q(doc, 'link[rel="canonical"]'), 'href')?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ??
    null;
  const asin = hints.asin ?? asinFromPage ?? '';

  const title = text(q(doc, '#productTitle')) || null;
  const subtitle = text(q(doc, '#productSubtitle')) || null;

  const formats = parseFormats(doc);
  const selectedFormat = formats.find((f) => f.selected) ?? null;
  const binding = text(qFirst(doc, ['#productBinding', '#bylineInfo .a-size-base + span', '#productSubtitle']));
  const format: ProductFormat | null =
    selectedFormat?.format ??
    detectFormat(binding) ??
    detectFormat(text(q(doc, '#bylineInfo'))) ??
    (/kindle/i.test(text(q(doc, '#title'))) ? 'kindle' : null);

  const publisher = get('publisher');
  const pubDate = parseLocaleDate(get('pubDate'));
  const pageCount = parseLocaleInt(get('printLength'));

  const bsrEntry = details.find((d) => d.key === 'bsr');
  const bsr = parseBsrEntry(bsrEntry);
  const categories: Product['categories'] = bsr.ranks.map((r) => ({ id: r.id, name: r.name }));

  const rating = parseRating(
    attr(q(doc, '#acrPopover'), 'title') ??
      text(qFirst(doc, ['#acrPopover .a-size-base.a-color-base', 'span[data-hook="rating-out-of-text"]', '#averageCustomerReviews .a-icon-alt'])),
  );
  const reviewsCount = parseLocaleInt(
    attr(q(doc, '#acrCustomerReviewText'), 'aria-label') ?? text(q(doc, '#acrCustomerReviewText')),
  );

  const priceEl = qFirst(doc, [
    '#tmmSwatches .selected .slot-price',
    '#tmmSwatches .selected .a-color-price',
    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
    '#corePrice_feature_div .a-price .a-offscreen',
    '#kindle-price',
    '#price',
    '.a-price .a-offscreen',
  ]);
  const priceCents = selectedFormat?.priceCents ?? parsePriceCents(text(priceEl));

  const product: Product = {
    asin,
    title,
    subtitle,
    authors: parseAuthors(doc),
    imageUrl: parseImage(doc),
    format: format ?? (bsr.store === 'kindle' ? 'kindle' : null),
    publisher,
    isIndependent: publisher ? INDEPENDENT_PUBLISHER_RE.test(publisher) : null,
    pubDate,
    language: get('language'),
    pageCount,
    isbn13: get('isbn13')?.replace(/[^\dX-]/gi, '') ?? null,
    dimensions: get('dimensions'),
    hasAplus: hasAplusContent(doc),
    categories,
  };

  const snapshot: ProductSnapshotInput = {
    asin,
    bsr: bsr.main,
    bsrStore: bsr.store,
    categoryRanks: bsr.ranks,
    priceCents,
    rating,
    reviewsCount,
    formats,
  };

  return { product, snapshot, locale: detectLocale(doc), isBotChallenge: bot };
}
