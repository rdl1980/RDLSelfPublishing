export type SearchAlias = 'stripbooks' | 'digital-text' | 'aps';

export interface KeywordSuggestion {
  value: string;
  normalized: string;
  /** Query che ha prodotto il suggerimento. */
  sourceQuery: string;
  /** Posizione nella lista di autocomplete (1 = più rilevante). */
  position: number;
  alias: SearchAlias;
}
