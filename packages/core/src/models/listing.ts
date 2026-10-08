import { isStopword, normalizeKeyword } from '../keywords/normalize';

/** Metriche di un'inserzione per il confronto con i concorrenti. */
export interface ListingMetrics {
  asin: string;
  titleLength: number;
  titleWords: number;
  subtitleLength: number;
  bulletsCount: number;
  descriptionLength: number;
  descriptionWords: number;
  hasAplus: boolean;
  aplusModules: number | null;
  hasDescription: boolean;
}

export interface ListingInput {
  asin: string;
  title: string | null;
  subtitle?: string | null;
  bullets?: string[] | null;
  description?: string | null;
  hasAplus?: boolean | null;
  aplusModules?: number | null;
}

const words = (s: string | null | undefined) =>
  s ? normalizeKeyword(s).split(' ').filter(Boolean) : [];

export function listingMetrics(l: ListingInput): ListingMetrics {
  const desc = l.description ?? '';
  return {
    asin: l.asin,
    titleLength: (l.title ?? '').length,
    titleWords: words(l.title).length,
    subtitleLength: (l.subtitle ?? '').length,
    bulletsCount: l.bullets?.length ?? 0,
    descriptionLength: desc.length,
    descriptionWords: words(desc).length,
    hasAplus: !!l.hasAplus,
    aplusModules: l.aplusModules ?? null,
    hasDescription: desc.length > 0,
  };
}

export interface TermStat {
  term: string;
  /** In quante inserzioni compare. */
  docs: number;
  /** Occorrenze totali. */
  count: number;
}

/** Frequenza dei termini (parole singole e bigrammi) in un insieme di testi, senza stopword e numeri puri. */
export function termFrequency(
  texts: string[],
  opts: { minLength?: number; bigrams?: boolean; max?: number } = {},
): TermStat[] {
  const { minLength = 3, bigrams = true, max = 60 } = opts;
  const stats = new Map<string, TermStat>();
  for (const t of texts) {
    const ws = words(t).filter((w) => w.length >= minLength || /^\d{4}$/.test(w));
    const terms = new Set<string>();
    const all: string[] = [];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i]!;
      if (!isStopword(w) && !/^\d+$/.test(w)) all.push(w);
      if (bigrams && i + 1 < ws.length) {
        const w2 = ws[i + 1]!;
        if (!isStopword(w) && !isStopword(w2)) all.push(`${w} ${w2}`);
      }
    }
    for (const term of all) {
      const s = stats.get(term) ?? { term, docs: 0, count: 0 };
      s.count++;
      if (!terms.has(term)) {
        terms.add(term);
        s.docs++;
      }
      stats.set(term, s);
    }
  }
  return [...stats.values()]
    .sort((a, b) => b.docs - a.docs || b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, max);
}

export interface ListingGap {
  term: string;
  docs: number;
  /** Quota di concorrenti che usano il termine. */
  share: number;
}

/** Termini usati da almeno `minShare` dei concorrenti (titolo + sottotitolo + bullet + descrizione) ma assenti nell'inserzione data. */
export function listingGaps(
  mine: ListingInput,
  competitors: ListingInput[],
  opts: { minShare?: number; max?: number } = {},
): ListingGap[] {
  const { minShare = 0.3, max = 30 } = opts;
  if (!competitors.length) return [];
  const textOf = (l: ListingInput) =>
    [l.title, l.subtitle, ...(l.bullets ?? []), l.description].filter(Boolean).join(' \n ');
  const mineText = normalizeKeyword(textOf(mine));
  const mineWords = new Set(mineText.split(' ').filter(Boolean));
  const freq = termFrequency(competitors.map(textOf), { max: 500 });
  return freq
    .filter((t) => t.docs / competitors.length >= minShare)
    .filter((t) => {
      const parts = t.term.split(' ');
      return parts.length === 1 ? !mineWords.has(t.term) : !mineText.includes(t.term);
    })
    .slice(0, max)
    .map((t) => ({ term: t.term, docs: t.docs, share: t.docs / competitors.length }));
}
