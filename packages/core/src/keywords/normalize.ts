/** Normalizza una keyword per confronti e dedupe: minuscolo, NFC, spazi collassati, punteggiatura superflua rimossa. Mantiene gli accenti. */
export function normalizeKeyword(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[“”"'’`´]/g, '')
    .replace(/[^\p{L}\p{N}\s+&-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dedupeKeywords<T extends { normalized: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (seen.has(it.normalized)) continue;
    seen.add(it.normalized);
    out.push(it);
  }
  return out;
}

const STOPWORDS = new Set(
  [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'ed', 'o', 'del', 'della', 'dei', 'delle', 'dello', 'al', 'alla', 'ai', 'alle', 'dal', 'dalla', 'nel', 'nella', 'nei', 'sul', 'sulla', 'che', 'non', 'più', 'con', 'vol', 'volume',
    'the', 'a', 'an', 'of', 'for', 'and', 'or', 'to', 'in', 'on', 'with', 'by', 'your', 'you',
  ],
);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}
