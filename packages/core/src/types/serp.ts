import type { ProductFormat } from '../locale/labels';

export interface SearchResultItem {
  asin: string;
  /** Posizione nella pagina, 1-based, inclusi gli sponsorizzati. */
  position: number;
  /** Posizione tra i soli risultati organici, null se sponsorizzato. */
  organicPosition: number | null;
  isSponsored: boolean;
  title: string | null;
  author: string | null;
  pubDate: string | null;
  format: ProductFormat | null;
  priceCents: number | null;
  rating: number | null;
  reviewsCount: number | null;
  imageUrl: string | null;
  url: string | null;
}

export interface SerpPage {
  keyword: string | null;
  alias: string | null;
  page: number;
  items: SearchResultItem[];
  totalResultsText: string | null;
  totalResultsEst: number | null;
  organicCount: number;
  sponsoredCount: number;
  locale: 'it' | 'en' | 'unknown';
  isBotChallenge: boolean;
}
