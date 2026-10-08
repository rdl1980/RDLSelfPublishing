/**
 * Regole degli avvisi di tracking: confrontano l'ultima rilevazione con la precedente e producono
 * avvisi leggibili. Le soglie sono modificabili dall'utente (profiles.settings.alerts).
 */
export interface AlertThresholds {
  /** Posizioni perse (in valore assoluto) oltre le quali scatta l'avviso. */
  rankDrop: number;
  /** Posizioni guadagnate oltre le quali scatta l'avviso positivo. */
  rankGain: number;
  /** Peggioramento relativo del BSR (0,5 = +50%) oltre il quale scatta l'avviso. */
  bsrWorsePct: number;
  /** Miglioramento relativo del BSR (0,3 = -30%). */
  bsrBetterPct: number;
  /** Variazione di prezzo relativa (0,1 = 10%). */
  pricePct: number;
  /** Recensioni nuove in un giorno oltre le quali segnalare. */
  reviewsJump: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  rankDrop: 10,
  rankGain: 10,
  bsrWorsePct: 0.5,
  bsrBetterPct: 0.3,
  pricePct: 0.1,
  reviewsJump: 5,
};

export function resolveAlertThresholds(partial?: Partial<AlertThresholds> | null): AlertThresholds {
  const out = { ...DEFAULT_ALERT_THRESHOLDS };
  if (!partial) return out;
  for (const k of Object.keys(out) as (keyof AlertThresholds)[]) {
    const v = partial[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

export type AlertKind =
  | 'rank_drop'
  | 'rank_gain'
  | 'rank_lost'
  | 'rank_found'
  | 'bsr_worse'
  | 'bsr_better'
  | 'price_change'
  | 'reviews_jump';

export interface AlertDraft {
  kind: AlertKind;
  severity: 'info' | 'warn' | 'good';
  asin: string | null;
  keyword: string | null;
  message: string;
  data: Record<string, number | string | null>;
}

export interface RankObservation {
  asin: string;
  keyword: string;
  /** Posizione assoluta (null = non trovato nelle pagine controllate). */
  position: number | null;
}

/** Avvisi sul posizionamento di un ASIN per una keyword: ultima rilevazione vs precedente. */
export function rankAlerts(
  prev: RankObservation | null,
  curr: RankObservation,
  t: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
  label?: string | null,
): AlertDraft[] {
  if (!prev) return [];
  const who = label ? `«${label}»` : curr.asin;
  const base = { asin: curr.asin, keyword: curr.keyword };
  if (prev.position != null && curr.position == null) {
    return [
      {
        ...base,
        kind: 'rank_lost',
        severity: 'warn',
        message: `${who} non compare più per «${curr.keyword}» (era in posizione ${prev.position}).`,
        data: { from: prev.position, to: null },
      },
    ];
  }
  if (prev.position == null && curr.position != null) {
    return [
      {
        ...base,
        kind: 'rank_found',
        severity: 'good',
        message: `${who} è entrato nei risultati per «${curr.keyword}» in posizione ${curr.position}.`,
        data: { from: null, to: curr.position },
      },
    ];
  }
  if (prev.position == null || curr.position == null) return [];
  const delta = curr.position - prev.position;
  if (delta >= t.rankDrop) {
    return [
      {
        ...base,
        kind: 'rank_drop',
        severity: 'warn',
        message: `${who} ha perso ${delta} posizioni per «${curr.keyword}»: da ${prev.position} a ${curr.position}.`,
        data: { from: prev.position, to: curr.position, delta },
      },
    ];
  }
  if (-delta >= t.rankGain) {
    return [
      {
        ...base,
        kind: 'rank_gain',
        severity: 'good',
        message: `${who} ha guadagnato ${-delta} posizioni per «${curr.keyword}»: da ${prev.position} a ${curr.position}.`,
        data: { from: prev.position, to: curr.position, delta },
      },
    ];
  }
  return [];
}

export interface AsinObservation {
  asin: string;
  bsr: number | null;
  priceCents: number | null;
  reviewsCount: number | null;
}

/** Avvisi su BSR, prezzo e recensioni di un ASIN: ultima rilevazione vs precedente. */
export function asinAlerts(
  prev: AsinObservation | null,
  curr: AsinObservation,
  t: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
  label?: string | null,
): AlertDraft[] {
  if (!prev) return [];
  const who = label ? `«${label}»` : curr.asin;
  const out: AlertDraft[] = [];
  const base = { asin: curr.asin, keyword: null };

  if (prev.bsr != null && curr.bsr != null && prev.bsr > 0) {
    const rel = (curr.bsr - prev.bsr) / prev.bsr;
    if (rel >= t.bsrWorsePct) {
      out.push({
        ...base,
        kind: 'bsr_worse',
        severity: 'warn',
        message: `${who}: BSR peggiorato del ${Math.round(rel * 100)}% (da ${prev.bsr} a ${curr.bsr}).`,
        data: { from: prev.bsr, to: curr.bsr, pct: Math.round(rel * 100) },
      });
    } else if (-rel >= t.bsrBetterPct) {
      out.push({
        ...base,
        kind: 'bsr_better',
        severity: 'good',
        message: `${who}: BSR migliorato del ${Math.round(-rel * 100)}% (da ${prev.bsr} a ${curr.bsr}).`,
        data: { from: prev.bsr, to: curr.bsr, pct: Math.round(rel * 100) },
      });
    }
  }
  if (
    prev.priceCents != null &&
    curr.priceCents != null &&
    prev.priceCents > 0 &&
    curr.priceCents > 0
  ) {
    const rel = (curr.priceCents - prev.priceCents) / prev.priceCents;
    if (Math.abs(rel) >= t.pricePct) {
      out.push({
        ...base,
        kind: 'price_change',
        severity: 'info',
        message: `${who}: prezzo ${rel > 0 ? 'aumentato' : 'diminuito'} da ${(prev.priceCents / 100).toFixed(2)} € a ${(curr.priceCents / 100).toFixed(2)} €.`,
        data: { from: prev.priceCents, to: curr.priceCents, pct: Math.round(rel * 100) },
      });
    }
  }
  if (prev.reviewsCount != null && curr.reviewsCount != null) {
    const d = curr.reviewsCount - prev.reviewsCount;
    if (d >= t.reviewsJump) {
      out.push({
        ...base,
        kind: 'reviews_jump',
        severity: 'info',
        message: `${who}: +${d} recensioni (da ${prev.reviewsCount} a ${curr.reviewsCount}).`,
        data: { from: prev.reviewsCount, to: curr.reviewsCount, delta: d },
      });
    }
  }
  return out;
}
