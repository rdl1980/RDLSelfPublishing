/** Etichette dei dettagli prodotto amazon.it nelle due locale che un utente può avere (italiano e inglese). */
export const DETAIL_LABELS = {
  publisher: ['editore', 'publisher'],
  pubDate: ['data di pubblicazione', 'publication date'],
  language: ['lingua', 'language'],
  printLength: ['lunghezza stampa', 'print length'],
  isbn13: ['isbn-13'],
  isbn10: ['isbn-10'],
  dimensions: ['dimensioni', 'dimensions'],
  weight: ['peso articolo', 'item weight'],
  asin: ['asin'],
  bsr: ['posizione nella classifica bestseller di amazon', 'best sellers rank', 'amazon bestseller rank'],
  fileSize: ['dimensioni file', 'file size'],
  reviews: ['recensioni clienti', 'customer reviews'],
} as const;

export type DetailKey = keyof typeof DETAIL_LABELS;

/** Rimuove i caratteri invisibili di direzionalità e i due punti che Amazon mette nelle etichette. */
export function cleanLabel(label: string): string {
  return label.replace(/[\u200e\u200f\u200b\u00a0]/g, ' ').replace(/:/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Riconosce l'etichetta (es. "Editore :") e ritorna la chiave corrispondente. */
export function detailKeyFor(label: string): DetailKey | null {
  const l = cleanLabel(label);
  for (const [key, names] of Object.entries(DETAIL_LABELS) as [DetailKey, readonly string[]][]) {
    if (names.some((n) => l === n || l.startsWith(n))) return key;
  }
  return null;
}

export const INDEPENDENT_PUBLISHER_RE = /independently published|pubblicazione indipendente|publicación independiente/i;

export type ProductFormat = 'paperback' | 'hardcover' | 'kindle' | 'audiobook' | 'other';

export const FORMAT_LABELS: { re: RegExp; format: ProductFormat }[] = [
  { re: /copertina flessibile|paperback|brossura/i, format: 'paperback' },
  { re: /copertina rigida|hardcover|rilegato/i, format: 'hardcover' },
  { re: /formato kindle|kindle edition|ebook kindle|\bkindle\b/i, format: 'kindle' },
  { re: /audiolibro|audiobook|audible/i, format: 'audiobook' },
];

export function detectFormat(text: string | null | undefined): ProductFormat | null {
  if (!text) return null;
  for (const { re, format } of FORMAT_LABELS) if (re.test(text)) return format;
  return null;
}

export const SPONSORED_RE = /\bsponsorizzat[oa]\b|\bsponsored\b/i;
export const BOT_CHALLENGE_RE = /captchacharacters|robot check|inserisci i caratteri|type the characters you see/i;
