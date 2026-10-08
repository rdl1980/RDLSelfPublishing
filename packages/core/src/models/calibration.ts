import { BSR_ANCHORS_US, IT_MARKET_FACTOR, type BsrStore } from '../config/bsr-anchors.it';
import { estimateDailySales } from './bsr-sales';

/**
 * Calibrazione della curva BSR → vendite con dati reali dell'utente (report KDP).
 * Ogni punto è una coppia osservata (BSR, copie al giorno) per uno store; il fattore di mercato
 * italiano stimato è la media geometrica dei rapporti tra vendite osservate e vendite che la curva
 * .com prevede a quel BSR. La media geometrica è robusta agli ordini di grandezza diversi dei punti.
 */
export interface CalibrationPoint {
  store: BsrStore;
  /** BSR osservato (media del periodo). */
  bsr: number;
  /** Copie vendute al giorno nel periodo (copie / giorni). */
  dailySales: number;
  /** Etichetta libera (titolo o ASIN). */
  label?: string;
  /** Data del rilevamento, ISO YYYY-MM-DD. */
  date?: string;
}

export interface CalibrationPointFit extends CalibrationPoint {
  /** Fattore implicato dal singolo punto. */
  impliedFactor: number;
  /** Vendite/giorno che la curva prevede con il fattore stimato. */
  fittedDailySales: number;
  /** Scostamento relativo: (osservato - stimato) / stimato. */
  residual: number;
}

export interface CalibrationFit {
  store: BsrStore;
  /** Fattore stimato; null se nessun punto valido. */
  factor: number | null;
  /** Fattore di default per confronto. */
  defaultFactor: number;
  /** Numero di punti usati. */
  n: number;
  /** Errore medio assoluto relativo sui punti (0,25 = 25%). */
  meanAbsResidual: number | null;
  points: CalibrationPointFit[];
}

export function isValidCalibrationPoint(
  p: Partial<CalibrationPoint> | null | undefined,
): p is CalibrationPoint {
  return (
    !!p &&
    (p.store === 'books' || p.store === 'kindle') &&
    typeof p.bsr === 'number' &&
    Number.isFinite(p.bsr) &&
    p.bsr >= 1 &&
    typeof p.dailySales === 'number' &&
    Number.isFinite(p.dailySales) &&
    p.dailySales > 0
  );
}

/** Fattore implicato da un singolo punto rispetto alle ancore .com. */
export function impliedFactor(p: CalibrationPoint): number | null {
  const base = estimateDailySales(p.bsr, p.store, BSR_ANCHORS_US);
  if (base == null || base <= 0) return null;
  return p.dailySales / base;
}

/** Stima il fattore di mercato per uno store dai punti osservati. */
export function fitMarketFactor(points: CalibrationPoint[], store: BsrStore): CalibrationFit {
  const valid = points.filter((p) => isValidCalibrationPoint(p) && p.store === store);
  const implied = valid
    .map((p) => ({ p, f: impliedFactor(p) }))
    .filter((x): x is { p: CalibrationPoint; f: number } => x.f != null && x.f > 0);
  const defaultFactor = IT_MARKET_FACTOR[store];
  if (!implied.length)
    return { store, factor: null, defaultFactor, n: 0, meanAbsResidual: null, points: [] };

  const logMean = implied.reduce((acc, x) => acc + Math.log(x.f), 0) / implied.length;
  const factor = Math.exp(logMean);
  const fitted = implied.map(({ p, f }) => {
    const base = estimateDailySales(p.bsr, p.store, BSR_ANCHORS_US) ?? 0;
    const fittedDailySales = base * factor;
    return {
      ...p,
      impliedFactor: f,
      fittedDailySales,
      residual: fittedDailySales > 0 ? (p.dailySales - fittedDailySales) / fittedDailySales : 0,
    };
  });
  const meanAbsResidual = fitted.reduce((acc, x) => acc + Math.abs(x.residual), 0) / fitted.length;
  return {
    store,
    factor: round4(factor),
    defaultFactor,
    n: fitted.length,
    meanAbsResidual,
    points: fitted,
  };
}

/** Copie/giorno da un periodo di report KDP: copie vendute e numero di giorni. */
export function dailySalesFromPeriod(copies: number, days: number): number | null {
  if (!Number.isFinite(copies) || !Number.isFinite(days) || days <= 0 || copies < 0) return null;
  return copies / days;
}

function round4(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}
