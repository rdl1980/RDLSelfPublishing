/** Strategia di espansione delle keyword per amazon.it (libri). */
export interface ExpansionConfig {
  prefixes: string[];
  suffixes: string[];
  letters: string[];
  years: string[];
  maxQueries: number;
  concurrency: number;
  minGapMs: number;
}

const currentYear = new Date().getFullYear();

export const EXPANSION_IT: ExpansionConfig = {
  prefixes: ['libro', 'libri', 'quaderno', 'agenda', 'diario', 'manuale', 'guida'],
  suffixes: ['per bambini', 'per ragazzi', 'per adulti', 'per principianti', 'in italiano', 'regalo', 'grande', 'anziani'],
  letters: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  years: [String(currentYear), String(currentYear + 1)],
  maxQueries: 150,
  concurrency: 4,
  minGapMs: 120,
};
