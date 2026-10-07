import { isStopword, normalizeKeyword } from './normalize';

/**
 * Genera frasi candidate (per il Reverse ASIN) dal titolo e sottotitolo di un libro:
 * segmenti separati da : | - ( ) e n-grammi di 2-4 parole senza stopword agli estremi.
 */
export function candidatePhrasesFromTitle(title: string, subtitle?: string | null, opts: { maxPhrases?: number; minWords?: number; maxWords?: number } = {}): string[] {
  const { maxPhrases = 40, minWords = 2, maxWords = 4 } = opts;
  const full = [title, subtitle ?? ''].filter(Boolean).join(' | ');
  const segments = full
    .split(/[:|()[\]•·–—-]+/)
    .map((s) => normalizeKeyword(s))
    .filter((s) => s.length >= 4);

  const candidates = new Map<string, number>();
  const add = (phrase: string, weight: number) => {
    const words = phrase.split(' ');
    if (words.length < minWords || words.length > maxWords + 2) return;
    if (/^\d+$/.test(phrase)) return;
    candidates.set(phrase, (candidates.get(phrase) ?? 0) + weight);
  };

  for (const seg of segments) {
    const tokens = seg.split(' ').filter(Boolean);
    const trimmed = trimStopwords(tokens);
    if (trimmed.length >= minWords && trimmed.length <= maxWords + 2) add(trimmed.join(' '), 3);
    for (let n = minWords; n <= maxWords; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const gram = tokens.slice(i, i + n);
        if (isStopword(gram[0]!) || isStopword(gram[gram.length - 1]!)) continue;
        if (gram.every((t) => /^\d+$/.test(t))) continue;
        add(gram.join(' '), 1 + (n === 2 ? 0.5 : 0));
      }
    }
  }
  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([p]) => p)
    .slice(0, maxPhrases);
}

function trimStopwords(tokens: string[]): string[] {
  let a = 0;
  let b = tokens.length;
  while (a < b && isStopword(tokens[a]!)) a++;
  while (b > a && isStopword(tokens[b - 1]!)) b--;
  return tokens.slice(a, b);
}
