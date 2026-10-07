/**
 * Pesi del punteggio nicchia (0-100). Ogni componente è normalizzata 0-100 in models/niche-score.ts.
 * Modificabili dall'utente (profiles.settings.score).
 */
export interface ScoreWeights {
  /** Domanda: vendite stimate dei primi 10 risultati. */
  demand: number;
  /** Concorrenza (inversa): mediana recensioni dei risultati organici. */
  competition: number;
  /** Quota di titoli KDP indipendenti: più alta = nicchia accessibile. */
  independent: number;
  /** Titoli recenti (ultimi 12 mesi) che vendono: segnale che un nuovo libro può entrare. */
  newEntrants: number;
  /** Prezzo mediano: margini sufficienti per il cartaceo. */
  price: number;
}

export const SCORE_WEIGHTS: ScoreWeights = {
  demand: 0.35,
  competition: 0.25,
  independent: 0.15,
  newEntrants: 0.15,
  price: 0.1,
};

/** Soglie usate per normalizzare le componenti. */
export const SCORE_THRESHOLDS = {
  /** Vendite mensili top 10 che valgono 100 punti di domanda (mercato IT). */
  demandSalesFor100: 600,
  /** Mediana recensioni che azzera il punteggio concorrenza. */
  reviewsFor0: 300,
  /** Prezzo mediano (centesimi) che vale 100 punti. */
  priceFor100Cents: 1500,
  /** Età massima (giorni) per considerare un titolo "nuovo". */
  newBookMaxAgeDays: 365,
} as const;
