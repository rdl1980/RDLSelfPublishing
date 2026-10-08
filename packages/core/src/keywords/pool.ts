import { candidatePhrasesFromTitle } from './ngrams';
import { normalizeKeyword } from './normalize';

export interface TitleInput {
  title: string | null | undefined;
  subtitle?: string | null;
}

/**
 * Pool condiviso di keyword candidate per un Reverse ASIN su più libri (es. i top 10 di un Deep View):
 * le frasi che compaiono nei titoli di più libri valgono di più, perché sono probabilmente le keyword
 * per cui tutta la nicchia si posiziona. Le frasi extra (es. la keyword del Deep View) vanno in testa.
 */
export function sharedCandidatePool(
  titles: TitleInput[],
  extra: string[] = [],
  opts: { max?: number; perTitle?: number } = {},
): string[] {
  const { max = 40, perTitle = 20 } = opts;
  const score = new Map<string, { titles: number; weight: number }>();
  for (const t of titles) {
    if (!t.title) continue;
    const phrases = candidatePhrasesFromTitle(t.title, t.subtitle ?? null, {
      maxPhrases: perTitle,
    });
    const seen = new Set<string>();
    for (const [i, p] of phrases.entries()) {
      if (seen.has(p)) continue;
      seen.add(p);
      const cur = score.get(p) ?? { titles: 0, weight: 0 };
      cur.titles += 1;
      cur.weight += 1 / (i + 1);
      score.set(p, cur);
    }
  }
  const ranked = [...score.entries()]
    .sort(
      (a, b) => b[1].titles - a[1].titles || b[1].weight - a[1].weight || a[0].length - b[0].length,
    )
    .map(([p]) => p);

  const out: string[] = [];
  const push = (p: string) => {
    const n = normalizeKeyword(p);
    if (n && !out.includes(n)) out.push(n);
  };
  for (const e of extra) push(e);
  for (const p of ranked) {
    if (out.length >= max) break;
    push(p);
  }
  return out.slice(0, max);
}
