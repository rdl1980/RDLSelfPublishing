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
import { parseListing } from './listing';
import { attr, detectLocale, q, qa, qFirst, text } from './dom';
import { firstPositivePrice } from './search-page';

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

  // Layout a tabella (libri con molte specifiche, cancelleria, articoli non librari)
  const seenRows = new Set<Element>();
  for (const tr of qa(doc, '#productDetails_detailBullets_sections1 tr, #productDetails_techSpec_section_1 tr, #productDetailsTable tr, #prodDetails tr, #productDetails_feature_div tr, table.prodDetTable tr')) {
    if (seenRows.has(tr)) continue;
    seenRows.add(tr);
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
  const anchors = qa(entry.element, 'a[href*="/gp/bestsellers/"]');
  if (!anchors.length) return parseBsrText(entry.value);

  // Ogni rank è "n. 123 in <a>Categoria</a>" oppure, per lo store principale,
  // "n. 123 in Store (<a>Visualizza i Top 100 nella categoria Store</a>)": il link dello store non ha id numerico.
  const RANK_RE = /(?:n\.\s*|#)?([\d][\d.,]*)\s+in\s+([^(\n]+)/i;
  let main: number | null = null;
  let store: BsrInfo['store'] = null;
  const ranks: CategoryRank[] = [];
  const seen = new Set<string>();
  for (const a of anchors) {
    const href = attr(a, 'href') ?? '';
    const id = categoryIdFromHref(href);
    const anchorText = text(a);
    const isMain = id === null || /top 100/i.test(anchorText);
    const container = a.parentElement ?? entry.element;
    const m = text(container).match(RANK_RE);
    if (!m) continue;
    const rank = parseLocaleInt(m[1]);
    if (rank === null) continue;
    if (isMain) {
      if (main === null) {
        main = rank;
        store = /kindle/i.test(m[2] ?? '') ? 'kindle' : 'books';
      }
      continue;
    }
    const name = anchorText || (m[2] ?? '').trim();
    const key = `${name}|${rank}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    ranks.push({ id, name, rank });
  }
  return { main, store, ranks };
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

  const listing = parseListing(doc);
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

  const priceCandidates = [
    '#tmmSwatches .selected .slot-price',
    '#tmmSwatches .selected .a-color-price',
    '#kindle-price',
    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
    '#corePrice_feature_div .a-price .a-offscreen',
    '#price',
    '.a-price .a-offscreen',
  ].flatMap((sel) => qa(doc, sel));
  const selectedPrice = selectedFormat?.priceCents && selectedFormat.priceCents > 0 ? selectedFormat.priceCents : null;
  const priceCents = selectedPrice ?? firstPositivePrice(priceCandidates);

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
    bullets: listing.bullets,
    description: listing.description,
    aplusModules: listing.aplusModules,
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
