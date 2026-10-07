import { EXPANSION_IT, type ExpansionConfig } from '../config/expansion.it';
import { normalizeKeyword } from './normalize';

export interface ExpansionOptions {
  prefixes?: boolean;
  suffixes?: boolean;
  letters?: boolean;
  years?: boolean;
  maxQueries?: number;
}

/** Costruisce la lista di query da mandare all'autocomplete a partire da una keyword seme. */
export function buildExpansionQueries(seed: string, cfg: ExpansionConfig = EXPANSION_IT, opts: ExpansionOptions = {}): string[] {
  const s = normalizeKeyword(seed);
  if (!s) return [];
  const { prefixes = true, suffixes = true, letters = true, years = true } = opts;
  const max = opts.maxQueries ?? cfg.maxQueries;

  const out: string[] = [s];
  const push = (q: string) => {
    const n = normalizeKeyword(q);
    if (n && n !== s && !out.includes(n)) out.push(n);
  };

  if (prefixes) for (const p of cfg.prefixes) if (!s.startsWith(p + ' ')) push(`${p} ${s}`);
  if (suffixes) for (const x of cfg.suffixes) if (!s.endsWith(' ' + x)) push(`${s} ${x}`);
  if (years) for (const y of cfg.years) if (!s.includes(y)) push(`${s} ${y}`);
  if (letters) for (const l of cfg.letters) push(`${s} ${l}`);

  return out.slice(0, max);
}
