/** Suddivisione dei job in chunk piccoli (≤ ~12 fetch) per sopravvivere alla vita breve del service worker. */

export const ENRICH_CHUNK_SIZE = 12;
export const SERP_CHUNK_SIZE = 3;

export function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface DeepViewState {
  serpDone: number[];
  asins: string[];
  enriched: string[];
}

export function emptyDeepViewState(): DeepViewState {
  return { serpDone: [], asins: [], enriched: [] };
}

/** Prossimo passo di un Deep View dato lo stato persistito. */
export function nextDeepViewStep(
  state: DeepViewState,
  params: { pages: number; enrich: boolean; maxAsins: number },
): { kind: 'serp'; pages: number[] } | { kind: 'enrich'; asins: string[] } | { kind: 'done' } {
  const pending = Array.from({ length: params.pages }, (_, i) => i + 1).filter((p) => !state.serpDone.includes(p));
  if (pending.length) return { kind: 'serp', pages: pending.slice(0, SERP_CHUNK_SIZE) };
  if (!params.enrich) return { kind: 'done' };
  const todo = state.asins.slice(0, params.maxAsins).filter((a) => !state.enriched.includes(a));
  if (todo.length) return { kind: 'enrich', asins: todo.slice(0, ENRICH_CHUNK_SIZE) };
  return { kind: 'done' };
}

export interface ReverseAsinState {
  /** Keyword già verificate. */
  checked: string[];
}

export function nextReverseAsinStep(state: ReverseAsinState, candidates: string[]): { kind: 'check'; keywords: string[] } | { kind: 'done' } {
  const todo = candidates.filter((c) => !state.checked.includes(c));
  if (!todo.length) return { kind: 'done' };
  // ogni keyword può costare fino a `pages` fetch: chunk piccoli
  return { kind: 'check', keywords: todo.slice(0, 3) };
}

/** Totale fetch stimate per la barra di avanzamento. */
export function estimateDeepViewTotal(params: { pages: number; enrich: boolean; maxAsins: number }, asinsFound?: number): number {
  const enrich = params.enrich ? Math.min(params.maxAsins, asinsFound ?? params.pages * 48) : 0;
  return params.pages + enrich;
}
