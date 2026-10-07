import { parseLocaleInt } from '../locale/it-number';
import type { CategoryRank } from '../types/product';

export interface BsrInfo {
  /** Rank nello store principale (Libri / Kindle Store). */
  main: number | null;
  store: 'books' | 'kindle' | null;
  ranks: CategoryRank[];
}

const MAIN_STORE_RE = /^(libri|books|kindle store|boutique kindle)$/i;

/**
 * Estrae i rank da un testo tipo
 * "n. 5.432 in Libri (Visualizza i Top 100 nella categoria Libri) n. 20 in Giochi di società n. 61 in Matematica"
 * oppure "5,432 in Books (See Top 100 in Books) 20 in Party Games".
 * I nomi categoria vengono tagliati al prossimo "n." / numero o parentesi.
 */
export function parseBsrText(raw: string, categoryIds: Map<string, string> = new Map()): BsrInfo {
  const s = raw.replace(/[\u200e\u200f]/g, ' ').replace(/\s+/g, ' ').trim();
  const re = /(?:n\.?\s*|#)?([\d][\d.,]*)\s+in\s+([^()\n]+?)(?=\s*(?:\(|n\.\s*\d|#\d|\d[\d.,]*\s+in\s|$))/gi;
  const ranks: CategoryRank[] = [];
  let main: number | null = null;
  let store: BsrInfo['store'] = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const rank = parseLocaleInt(m[1]);
    const name = (m[2] ?? '').replace(/\s*(visualizza|see|vedi)\s.*$/i, '').trim();
    if (rank === null || !name) continue;
    if (MAIN_STORE_RE.test(name)) {
      if (main === null) {
        main = rank;
        store = /kindle/i.test(name) ? 'kindle' : 'books';
      }
      continue;
    }
    ranks.push({ id: categoryIds.get(name.toLowerCase()) ?? null, name, rank });
  }
  return { main, store, ranks };
}

/** Id categoria da un href tipo "/gp/bestsellers/books/90130494031/ref=..." */
export function categoryIdFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/bestsellers\/[a-z-]+\/(\d+)/i);
  return m ? m[1]! : null;
}
