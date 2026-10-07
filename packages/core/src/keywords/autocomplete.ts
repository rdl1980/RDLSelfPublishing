import type { KeywordSuggestion, SearchAlias } from '../types/keyword';
import { dedupeKeywords, normalizeKeyword } from './normalize';

export const AMAZON_IT_MARKETPLACE_ID = 'APJ6JRA9NG5V4';

export function autocompleteUrl(prefix: string, alias: SearchAlias = 'stripbooks'): string {
  const u = new URL('https://completion.amazon.it/api/2017/suggestions');
  u.searchParams.set('mid', AMAZON_IT_MARKETPLACE_ID);
  u.searchParams.set('alias', alias);
  u.searchParams.set('prefix', prefix);
  u.searchParams.set('limit', '11');
  return u.toString();
}

interface AmazonSuggestionsResponse {
  suggestions?: { value?: string; type?: string }[];
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Interroga l'autocomplete di amazon.it per una singola query. */
export async function fetchSuggestions(
  fetchImpl: FetchLike,
  q: { prefix: string; alias?: SearchAlias; signal?: AbortSignal },
): Promise<KeywordSuggestion[]> {
  const alias = q.alias ?? 'stripbooks';
  const res = await fetchImpl(autocompleteUrl(q.prefix, alias), {
    signal: q.signal,
    headers: { accept: 'application/json', 'accept-language': 'it-IT,it;q=0.9' },
  });
  if (!res.ok) throw new Error(`Autocomplete amazon.it HTTP ${res.status}`);
  const data = (await res.json()) as AmazonSuggestionsResponse;
  const out: KeywordSuggestion[] = [];
  for (const [i, s] of (data.suggestions ?? []).entries()) {
    const value = (s.value ?? '').trim();
    if (!value) continue;
    out.push({ value, normalized: normalizeKeyword(value), sourceQuery: q.prefix, position: i + 1, alias });
  }
  return out;
}

export interface ExpandProgress {
  done: number;
  total: number;
  found: number;
}

/** Esegue più query con un pool di concorrenza limitata e restituisce i suggerimenti deduplicati. */
export async function runSuggestionQueries(
  fetchImpl: FetchLike,
  queries: string[],
  opts: { alias?: SearchAlias; concurrency?: number; minGapMs?: number; signal?: AbortSignal; onProgress?: (p: ExpandProgress) => void } = {},
): Promise<{ suggestions: KeywordSuggestion[]; errors: { query: string; error: string }[] }> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const gap = opts.minGapMs ?? 120;
  const all: KeywordSuggestion[] = [];
  const errors: { query: string; error: string }[] = [];
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < queries.length) {
      if (opts.signal?.aborted) return;
      const q = queries[next++]!;
      try {
        all.push(...(await fetchSuggestions(fetchImpl, { prefix: q, alias: opts.alias, signal: opts.signal })));
      } catch (e) {
        errors.push({ query: q, error: e instanceof Error ? e.message : String(e) });
      }
      done++;
      opts.onProgress?.({ done, total: queries.length, found: dedupeKeywords(all).length });
      if (gap > 0) await new Promise((r) => setTimeout(r, gap + Math.random() * gap));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queries.length) }, worker));

  // Ordina: prima i suggerimenti apparsi più volte / più in alto
  const score = new Map<string, number>();
  for (const s of all) score.set(s.normalized, (score.get(s.normalized) ?? 0) + 1 / s.position);
  const suggestions = dedupeKeywords(all).sort((a, b) => (score.get(b.normalized) ?? 0) - (score.get(a.normalized) ?? 0));
  return { suggestions, errors };
}
