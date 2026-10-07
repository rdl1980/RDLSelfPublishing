/**
 * Parsing di numeri e prezzi come compaiono su amazon.it, tollerante alla locale
 * (italiano "5.432" / "7,99 €", inglese "5,432" / "€7.99").
 */

/** Converte "5.432", "5,432", "1.234,56", "1,234.56", "94" in numero. Ritorna null se non riconosciuto. */
export function parseLocaleNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  // Primo token numerico: cifre con eventuali separatori interni (es. "n. 5.432 in Libri" → "5.432").
  const m = input.match(/-?\d(?:[\d.,]*\d)?/);
  if (!m) return null;
  const s = m[0];

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = s;
  } else if (lastDot !== -1 && lastComma !== -1) {
    // Entrambi presenti: l'ultimo separatore è quello decimale.
    normalized =
      lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else {
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = s.split(sep);
    const tail = parts[parts.length - 1] ?? '';
    // Un solo tipo di separatore: se tutti i gruppi dopo il primo hanno 3 cifre è un separatore delle migliaia.
    const isThousands =
      parts.length > 1 && tail.length === 3 && parts.slice(1).every((p) => p.length === 3);
    normalized = isThousands ? parts.join('') : parts.slice(0, -1).join('') + '.' + tail;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Intero (es. numero recensioni "(1.234)" o rank "n. 5.432"). */
export function parseLocaleInt(input: string | null | undefined): number | null {
  const n = parseLocaleNumber(input);
  return n === null ? null : Math.round(n);
}

/** Prezzo in centesimi: "€7,99" → 799, "7,99 €" → 799, "€1.234,56" → 123456, "$7.99" → 799. */
export function parsePriceCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = input.match(/-?\d[\d.,]*/);
  if (!m) return null;
  const n = parseLocaleNumber(m[0]);
  return n === null ? null : Math.round(n * 100);
}

/** Rating "4,6 su 5 stelle" / "4.6 out of 5 stars" / "4,6" → 4.6 */
export function parseRating(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = input.match(/(\d[.,]\d)|(\d)(?=\s*(su|out of|\/)\s*5)/);
  if (!m) return null;
  const n = parseLocaleNumber(m[0]);
  return n !== null && n >= 0 && n <= 5 ? n : null;
}

/**
 * Formatta un numero con separatori italiani: 5432 -> "5.432"; 7.99 -> "7,99".
 * Implementazione manuale (niente Intl) per avere lo stesso output su server e client
 * ed evitare errori di idratazione in React.
 */
export function formatIt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '-';
  const sign = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return sign + grouped + (decPart ? ',' + decPart : '');
}

export function formatEuroCents(cents: number): string {
  return formatIt(cents / 100, 2) + ' €';
}
