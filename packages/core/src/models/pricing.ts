import type { BsrAnchor, BsrStore } from '../config/bsr-anchors.it';
import {
  KDP_EU_CONFIG,
  type Binding,
  type InkType,
  type KdpPrintConfig,
  type TrimSize,
} from '../config/kdp-print-costs.eu';
import { estimateMonthlySales } from './bsr-sales';
import { kindleRoyalty, printRoyalty } from './royalty';

export interface PriceScenario {
  listPriceCents: number;
  royaltyRate: number;
  costCents: number;
  royaltyCents: number;
  marginPct: number;
  /** Copie/mese stimate al BSR target (costanti rispetto al prezzo). */
  monthlySales: number | null;
  monthlyRoyaltyCents: number | null;
  /** Royalty mensile relativa al massimo della tabella (1 = migliore). */
  relativeToBest: number;
  isBreakEven: boolean;
  isTierChange: boolean;
}

export interface PriceTableInput {
  mode: 'paperback' | 'hardcover' | 'kindle';
  pageCount?: number;
  ink?: InkType;
  trim?: TrimSize;
  fileSizeMb?: number;
  /** BSR obiettivo da cui stimare le copie/mese. */
  targetBsr?: number | null;
  store?: BsrStore;
  anchors?: Record<BsrStore, BsrAnchor[]>;
  minPriceCents?: number;
  maxPriceCents?: number;
  stepCents?: number;
}

/**
 * Tabella prezzo → royalty → copie/mese → royalty mensile per scegliere il prezzo di listino.
 * Le copie/mese dipendono dal BSR target e non dal prezzo: la tabella mostra quanto ogni prezzo
 * renderebbe a parità di posizionamento, evidenziando il pareggio e il salto di aliquota (9,99 €).
 */
export function priceTable(
  input: PriceTableInput,
  cfg: KdpPrintConfig = KDP_EU_CONFIG,
): PriceScenario[] {
  const step = input.stepCents ?? 50;
  const min = input.minPriceCents ?? (input.mode === 'kindle' ? 99 : 499);
  const max = input.maxPriceCents ?? (input.mode === 'kindle' ? 1499 : 2999);
  const monthlySales =
    input.targetBsr != null
      ? estimateMonthlySales(
          input.targetBsr,
          input.store ?? (input.mode === 'kindle' ? 'kindle' : 'books'),
          input.anchors,
        )
      : null;

  const rows: PriceScenario[] = [];
  let prevRate: number | null = null;
  let prevNegative = true;
  for (let price = min; price <= max; price += step) {
    const r =
      input.mode === 'kindle'
        ? kindleRoyalty({ listPriceCents: price, fileSizeMb: input.fileSizeMb ?? 0 }, cfg)
        : printRoyalty(
            {
              listPriceCents: price,
              pageCount: input.pageCount ?? 100,
              binding: input.mode as Binding,
              ink: input.ink,
              trim: input.trim,
            },
            cfg,
          );
    const positive = r.royaltyCents > 0;
    rows.push({
      listPriceCents: price,
      royaltyRate: r.royaltyRate,
      costCents: input.mode === 'kindle' ? r.deliveryCostCents : r.printCostCents,
      royaltyCents: r.royaltyCents,
      marginPct: r.marginPct,
      monthlySales,
      monthlyRoyaltyCents: monthlySales == null ? null : Math.round(r.royaltyCents * monthlySales),
      relativeToBest: 0,
      isBreakEven: positive && prevNegative,
      isTierChange: prevRate != null && r.royaltyRate !== prevRate,
    });
    prevRate = r.royaltyRate;
    prevNegative = !positive;
  }
  const best = Math.max(0, ...rows.map((x) => x.royaltyCents));
  for (const x of rows) x.relativeToBest = best > 0 ? Math.max(0, x.royaltyCents) / best : 0;
  return rows;
}
