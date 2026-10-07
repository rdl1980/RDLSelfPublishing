import type { ProductFormat } from '../locale/labels';

export interface CategoryRank {
  /** Id categoria Amazon (dall'URL /gp/bestsellers/books/<id>), null per lo store principale. */
  id: string | null;
  name: string;
  rank: number;
}

export interface FormatOffer {
  format: ProductFormat;
  label: string;
  priceCents: number | null;
  selected: boolean;
}

/** Dati stabili di un prodotto (cambiano raramente). */
export interface Product {
  asin: string;
  title: string | null;
  subtitle: string | null;
  authors: string[];
  imageUrl: string | null;
  format: ProductFormat | null;
  publisher: string | null;
  isIndependent: boolean | null;
  pubDate: string | null; // ISO YYYY-MM-DD
  language: string | null;
  pageCount: number | null;
  isbn13: string | null;
  dimensions: string | null;
  hasAplus: boolean;
  categories: { id: string | null; name: string }[];
}

/** Dati che variano nel tempo (una riga di product_snapshots). */
export interface ProductSnapshotInput {
  asin: string;
  bsr: number | null;
  bsrStore: 'books' | 'kindle' | null;
  categoryRanks: CategoryRank[];
  priceCents: number | null;
  rating: number | null;
  reviewsCount: number | null;
  formats: FormatOffer[];
}

export interface ParsedProduct {
  product: Product;
  snapshot: ProductSnapshotInput;
  locale: 'it' | 'en' | 'unknown';
  isBotChallenge: boolean;
}
