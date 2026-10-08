import { isStopword, normalizeKeyword } from './normalize';

/**
 * Proposta dei 7 campi keyword "backend" di KDP (max 50 caratteri ciascuno).
 * Regole KDP applicate: niente parole già nel titolo/sottotitolo/autore (sono già indicizzate),
 * niente ripetizioni tra i campi, niente virgolette, niente nomi di altri autori o marchi
 * (quelli vanno tolti a mano), al massimo 50 caratteri per campo (spazi inclusi).
 *
 * Strategia: le frasi candidate (ordinate per peso) vengono spezzate in parole nuove; le parole
 * vengono impacchettate nei 7 campi preservando l'ordine delle frasi, così le frasi a corrispondenza
 * esatta restano contigue quando ci stanno.
 */
export interface WeightedPhrase {
  phrase: string;
  weight: number;
}

export interface KdpKeywordSuggestion {
  fields: string[];
  /** Parole scartate perché già nel titolo (o stopword). */
  skippedTitleWords: string[];
  /** Frasi non entrate per mancanza di spazio. */
  leftover: string[];
  /** Quante parole uniche coperte. */
  coveredWords: number;
}

export const KDP_FIELD_MAX = 50;
export const KDP_FIELDS = 7;

export function suggestKdpKeywords(
  candidates: WeightedPhrase[],
  opts: {
    title?: string | null;
    subtitle?: string | null;
    author?: string | null;
    fields?: number;
    maxLength?: number;
    excludeWords?: string[];
  } = {},
): KdpKeywordSuggestion {
  const fields = opts.fields ?? KDP_FIELDS;
  const maxLength = opts.maxLength ?? KDP_FIELD_MAX;
  const titleWords = new Set(
    normalizeKeyword([opts.title, opts.subtitle, opts.author].filter(Boolean).join(' '))
      .split(' ')
      .filter(Boolean),
  );
  for (const w of opts.excludeWords ?? []) titleWords.add(normalizeKeyword(w));

  const slots: string[][] = Array.from({ length: fields }, () => []);
  const used = new Set<string>();
  const skipped = new Set<string>();
  const leftover: string[] = [];

  const ordered = [...candidates]
    .map((c) => ({ phrase: normalizeKeyword(c.phrase), weight: c.weight }))
    .filter((c) => c.phrase)
    .sort((a, b) => b.weight - a.weight);

  const lengthOf = (words: string[]) => words.join(' ').length;

  for (const c of ordered) {
    const fresh: string[] = [];
    for (const w of c.phrase.split(' ')) {
      if (titleWords.has(w)) {
        skipped.add(w);
        continue;
      }
      if (isStopword(w) || used.has(w) || fresh.includes(w)) continue;
      fresh.push(w);
    }
    if (!fresh.length) continue;
    // Prova a mettere tutta la frase in un campo (preferisce il campo più pieno in cui ci sta: meno frammentazione)
    let placed = false;
    const order = slots.map((s, i) => ({ s, i })).sort((a, b) => lengthOf(b.s) - lengthOf(a.s));
    for (const { s } of order) {
      const candidate = [...s, ...fresh];
      if (lengthOf(candidate) <= maxLength) {
        s.push(...fresh);
        fresh.forEach((w) => used.add(w));
        placed = true;
        break;
      }
    }
    if (placed) continue;
    // Altrimenti parola per parola dove c'è spazio
    const remaining: string[] = [];
    for (const w of fresh) {
      const target = slots.find((s) => lengthOf([...s, w]) <= maxLength);
      if (target) {
        target.push(w);
        used.add(w);
      } else remaining.push(w);
    }
    if (remaining.length) leftover.push(remaining.join(' '));
  }

  return {
    fields: slots.map((s) => s.join(' ')),
    skippedTitleWords: [...skipped],
    leftover,
    coveredWords: used.size,
  };
}
