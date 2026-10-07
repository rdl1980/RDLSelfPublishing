import type { SearchAlias } from './types/keyword';

export const ASIN_RE = /^[A-Z0-9]{10}$/;
export const AMAZON_IT = 'https://www.amazon.it';

export function buildSearchUrl(keyword: string, alias: SearchAlias = 'stripbooks', page = 1): string {
  const u = new URL(`${AMAZON_IT}/s`);
  u.searchParams.set('k', keyword);
  u.searchParams.set('i', alias);
  if (page > 1) u.searchParams.set('page', String(page));
  return u.toString();
}

export function productUrl(asin: string): string {
  return `${AMAZON_IT}/dp/${asin}`;
}

export function extractAsin(input: string): string | null {
  const s = input.trim();
  if (ASIN_RE.test(s)) return s;
  const m = s.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return m ? m[1]!.toUpperCase() : null;
}

export function isAmazonSearchUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith('amazon.it') && u.pathname.startsWith('/s');
  } catch {
    return false;
  }
}

export function parseSearchUrl(url: string): { keyword: string | null; alias: string | null; page: number } {
  try {
    const u = new URL(url);
    return {
      keyword: u.searchParams.get('k'),
      alias: u.searchParams.get('i'),
      page: Number(u.searchParams.get('page') ?? '1') || 1,
    };
  } catch {
    return { keyword: null, alias: null, page: 1 };
  }
}
