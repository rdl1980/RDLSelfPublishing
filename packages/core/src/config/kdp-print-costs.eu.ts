/**
 * Costi di stampa KDP per i marketplace europei (amazon.it) e aliquote royalty.
 *
 * ATTENZIONE: valori indicativi ricostruiti dalle tabelle pubbliche KDP; vanno VERIFICATI su
 * https://kdp.amazon.com/help/topic/G201834340 (costi di stampa) e G200644210 (royalty) prima di
 * fissare un prezzo. Modificabili dall'utente in Impostazioni (profiles.settings.kdp).
 */
export type InkType = 'bw' | 'standard_color' | 'premium_color';
export type TrimSize = 'regular' | 'large';
export type Binding = 'paperback' | 'hardcover';

export interface PrintCostRule {
  /** Pagine massime coperte dal costo fisso "libro piccolo" (sotto questa soglia non si paga per pagina). */
  smallBookMaxPages: number;
  smallBookFixedCents: number;
  /** Oltre la soglia: fisso + per pagina. */
  fixedCents: number;
  perPageCents: number;
  minPages: number;
  maxPages: number;
}

export interface KdpPrintConfig {
  effectiveDate: string;
  currency: 'EUR';
  paperback: Record<InkType, Record<TrimSize, PrintCostRule>>;
  hardcover: Record<InkType, Record<TrimSize, PrintCostRule>>;
  /** Aliquota royalty per fascia di prezzo di listino (prima fascia che include il prezzo). */
  printRoyaltyTiers: { maxListPriceCents: number | null; rate: number }[];
  kindle: {
    plan70: { minPriceCents: number; maxPriceCents: number; deliveryCentsPerMb: number; rate: number };
    plan35: { rate: number };
  };
}

const rule = (
  smallBookMaxPages: number,
  smallBookFixedCents: number,
  fixedCents: number,
  perPageCents: number,
  minPages: number,
  maxPages: number,
): PrintCostRule => ({ smallBookMaxPages, smallBookFixedCents, fixedCents, perPageCents, minPages, maxPages });

export const KDP_EU_CONFIG: KdpPrintConfig = {
  effectiveDate: '2025-06-10', // DA VERIFICARE: ultimo aggiornamento noto dei costi di stampa KDP
  currency: 'EUR',
  paperback: {
    bw: {
      regular: rule(108, 222, 90, 1.2, 24, 828),
      large: rule(108, 265, 90, 1.7, 24, 828),
    },
    standard_color: {
      regular: rule(72, 320, 150, 3.0, 72, 600),
      large: rule(72, 350, 150, 3.8, 72, 600),
    },
    premium_color: {
      regular: rule(40, 385, 90, 7.0, 24, 828),
      large: rule(40, 395, 90, 8.0, 24, 828),
    },
  },
  hardcover: {
    bw: {
      regular: rule(108, 612, 480, 1.2, 75, 550),
      large: rule(108, 655, 480, 1.7, 75, 550),
    },
    standard_color: {
      regular: rule(72, 710, 540, 3.0, 75, 550),
      large: rule(72, 740, 540, 3.8, 75, 550),
    },
    premium_color: {
      regular: rule(40, 775, 480, 7.0, 75, 550),
      large: rule(40, 785, 480, 8.0, 75, 550),
    },
  },
  // Dal 10 giugno 2025 KDP applica il 50% sotto i 9,99 € e il 60% sopra (DA VERIFICARE).
  printRoyaltyTiers: [
    { maxListPriceCents: 999, rate: 0.5 },
    { maxListPriceCents: null, rate: 0.6 },
  ],
  kindle: {
    plan70: { minPriceCents: 299, maxPriceCents: 999, deliveryCentsPerMb: 12, rate: 0.7 },
    plan35: { rate: 0.35 },
  },
};

/** IVA italiana sui libri (cartacei ed ebook): 4%. */
export const VAT_IT = { print: 0.04, ebook: 0.04 } as const;
