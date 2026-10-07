/** Parsing date come compaiono su amazon.it: "4 ott 2023", "4 ottobre 2023", "4 Oct. 2023", "Oct 4, 2023", "2023-10-04". */

const MONTHS: Record<string, number> = {
  gen: 1, gennaio: 1, jan: 1, january: 1,
  feb: 2, febbraio: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  apr: 4, aprile: 4, april: 4,
  mag: 5, maggio: 5, may: 5,
  giu: 6, giugno: 6, jun: 6, june: 6,
  lug: 7, luglio: 7, jul: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, settembre: 9, sep: 9, sept: 9, september: 9,
  ott: 10, ottobre: 10, oct: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dic: 12, dicembre: 12, dec: 12, december: 12,
};

function toIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Ritorna la data in formato ISO "YYYY-MM-DD" oppure null. */
export function parseLocaleDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/\./g, '');

  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // "4 ott 2023" / "4 ottobre 2023" / "4 oct 2023"
  const dmy = s.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (dmy) {
    const m = MONTHS[dmy[2]!];
    if (m) return toIso(Number(dmy[3]), m, Number(dmy[1]));
  }

  // "oct 4, 2023" / "october 4 2023"
  const mdy = s.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdy) {
    const m = MONTHS[mdy[1]!];
    if (m) return toIso(Number(mdy[3]), m, Number(mdy[2]));
  }

  // "ott 2023" (solo mese e anno) → primo del mese
  const my = s.match(/^([a-z]+)\s+(\d{4})$/);
  if (my) {
    const m = MONTHS[my[1]!];
    if (m) return toIso(Number(my[2]), m, 1);
  }

  // "04/10/2023"
  const slash = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return toIso(Number(slash[3]), Number(slash[2]), Number(slash[1]));

  return null;
}

/** Giorni interi trascorsi da una data ISO a `now` (default oggi). */
export function daysSince(isoDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!isoDate) return null;
  const t = Date.parse(isoDate + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}
