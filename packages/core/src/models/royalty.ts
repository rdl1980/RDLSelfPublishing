import { KDP_EU_CONFIG, VAT_IT, type Binding, type InkType, type KdpPrintConfig, type TrimSize } from '../config/kdp-print-costs.eu';

export interface RoyaltyResult {
  listPriceCents: number;
  /** Prezzo al netto dell'IVA, base su cui si calcola la royalty. */
  netPriceCents: number;
  printCostCents: number;
  deliveryCostCents: number;
  royaltyRate: number;
  royaltyCents: number;
  /** Royalty / prezzo di listino. */
  marginPct: number;
  /** Prezzo di listino minimo per avere royalty ≥ 0 (solo stampa). */
  breakEvenListPriceCents: number | null;
  warnings: string[];
}

export interface PrintRoyaltyInput {
  listPriceCents: number;
  pageCount: number;
  binding?: Binding;
  ink?: InkType;
  trim?: TrimSize;
}

export function printCostCents(input: { pageCount: number; binding?: Binding; ink?: InkType; trim?: TrimSize }, cfg: KdpPrintConfig = KDP_EU_CONFIG): { cents: number; warnings: string[] } {
  const binding = input.binding ?? 'paperback';
  const ink = input.ink ?? 'bw';
  const trim = input.trim ?? 'regular';
  const r = cfg[binding][ink][trim];
  const warnings: string[] = [];
  const pages = Math.max(1, Math.round(input.pageCount));
  if (pages < r.minPages) warnings.push(`Pagine sotto il minimo KDP (${r.minPages}) per questo formato.`);
  if (pages > r.maxPages) warnings.push(`Pagine sopra il massimo KDP (${r.maxPages}) per questo formato.`);
  const cents = pages <= r.smallBookMaxPages ? r.smallBookFixedCents : r.fixedCents + pages * r.perPageCents;
  return { cents: Math.round(cents), warnings };
}

export function printRoyaltyRate(listPriceCents: number, cfg: KdpPrintConfig = KDP_EU_CONFIG): number {
  for (const tier of cfg.printRoyaltyTiers) {
    if (tier.maxListPriceCents === null || listPriceCents <= tier.maxListPriceCents) return tier.rate;
  }
  return cfg.printRoyaltyTiers[cfg.printRoyaltyTiers.length - 1]?.rate ?? 0.6;
}

/** Royalty per cartaceo (paperback o hardcover) venduto su amazon.it. */
export function printRoyalty(input: PrintRoyaltyInput, cfg: KdpPrintConfig = KDP_EU_CONFIG, vat: number = VAT_IT.print): RoyaltyResult {
  const { cents: cost, warnings } = printCostCents(input, cfg);
  const net = input.listPriceCents / (1 + vat);
  const rate = printRoyaltyRate(input.listPriceCents, cfg);
  const royalty = rate * net - cost;
  if (royalty < 0) warnings.push('Il prezzo non copre il costo di stampa: KDP non accetta prezzi con royalty negativa.');
  // Break-even: rate * P/(1+vat) = cost → P = cost*(1+vat)/rate (si usa la fascia più bassa come prudenza).
  const lowestRate = Math.min(...cfg.printRoyaltyTiers.map((t) => t.rate));
  const breakEven = Math.ceil((cost * (1 + vat)) / lowestRate);
  return {
    listPriceCents: input.listPriceCents,
    netPriceCents: Math.round(net),
    printCostCents: cost,
    deliveryCostCents: 0,
    royaltyRate: rate,
    royaltyCents: Math.round(royalty),
    marginPct: input.listPriceCents > 0 ? royalty / input.listPriceCents : 0,
    breakEvenListPriceCents: breakEven,
    warnings,
  };
}

export const paperbackRoyalty = (input: Omit<PrintRoyaltyInput, 'binding'>, cfg?: KdpPrintConfig) =>
  printRoyalty({ ...input, binding: 'paperback' }, cfg);
export const hardcoverRoyalty = (input: Omit<PrintRoyaltyInput, 'binding'>, cfg?: KdpPrintConfig) =>
  printRoyalty({ ...input, binding: 'hardcover' }, cfg);

export interface KindleRoyaltyInput {
  listPriceCents: number;
  fileSizeMb?: number;
  plan?: 35 | 70;
}

/** Royalty Kindle (eBook) su amazon.it. */
export function kindleRoyalty(input: KindleRoyaltyInput, cfg: KdpPrintConfig = KDP_EU_CONFIG, vat: number = VAT_IT.ebook): RoyaltyResult {
  const warnings: string[] = [];
  const net = input.listPriceCents / (1 + vat);
  let plan = input.plan ?? 70;
  const p70 = cfg.kindle.plan70;
  if (plan === 70 && (input.listPriceCents < p70.minPriceCents || input.listPriceCents > p70.maxPriceCents)) {
    warnings.push(`Il piano 70% richiede un prezzo tra ${p70.minPriceCents / 100} € e ${p70.maxPriceCents / 100} €: applicato il 35%.`);
    plan = 35;
  }
  const delivery = plan === 70 ? Math.round((input.fileSizeMb ?? 0) * p70.deliveryCentsPerMb) : 0;
  const rate = plan === 70 ? p70.rate : cfg.kindle.plan35.rate;
  const royalty = plan === 70 ? rate * (net - delivery) : rate * net;
  return {
    listPriceCents: input.listPriceCents,
    netPriceCents: Math.round(net),
    printCostCents: 0,
    deliveryCostCents: delivery,
    royaltyRate: rate,
    royaltyCents: Math.round(Math.max(0, royalty)),
    marginPct: input.listPriceCents > 0 ? Math.max(0, royalty) / input.listPriceCents : 0,
    breakEvenListPriceCents: null,
    warnings,
  };
}
