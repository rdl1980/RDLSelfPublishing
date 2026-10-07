'use client';

import { formatEuroCents, KDP_EU_CONFIG, kindleRoyalty, printRoyalty, type Binding, type InkType, type RoyaltyResult, type TrimSize } from '@rdl/core';
import { useState } from 'react';
import { Alert, Card, Input, Label, Select, Stat } from '@/components/ui';

type Mode = 'paperback' | 'hardcover' | 'kindle';

export function RoyaltyCalculator() {
  const [mode, setMode] = useState<Mode>('paperback');
  const [price, setPrice] = useState('12,99');
  const [pages, setPages] = useState('120');
  const [ink, setInk] = useState<InkType>('bw');
  const [trim, setTrim] = useState<TrimSize>('regular');
  const [fileMb, setFileMb] = useState('1');
  const [plan, setPlan] = useState<35 | 70>(70);

  const priceCents = Math.round(Number(price.replace(',', '.')) * 100) || 0;
  const pageCount = Number(pages) || 0;

  let result: RoyaltyResult | null = null;
  if (priceCents > 0) {
    result =
      mode === 'kindle'
        ? kindleRoyalty({ listPriceCents: priceCents, fileSizeMb: Number(fileMb.replace(',', '.')) || 0, plan })
        : printRoyalty({ listPriceCents: priceCents, pageCount, binding: mode as Binding, ink, trim });
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`rounded px-3 py-1.5 text-sm ${mode === m ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {tab('paperback', 'Copertina flessibile')}
        {tab('hardcover', 'Copertina rigida')}
        {tab('kindle', 'Kindle')}
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Prezzo di listino (€, IVA inclusa)</Label>
            <Input className="mt-1 w-32" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </div>
          {mode !== 'kindle' ? (
            <>
              <div>
                <Label>Pagine</Label>
                <Input className="mt-1 w-24" value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <Label>Inchiostro</Label>
                <Select className="mt-1" value={ink} onChange={(e) => setInk(e.target.value as InkType)}>
                  <option value="bw">Bianco e nero</option>
                  <option value="standard_color">Colore standard</option>
                  <option value="premium_color">Colore premium</option>
                </Select>
              </div>
              <div>
                <Label>Formato</Label>
                <Select className="mt-1" value={trim} onChange={(e) => setTrim(e.target.value as TrimSize)}>
                  <option value="regular">Standard (fino a 15,5×23 cm)</option>
                  <option value="large">Grande (oltre 15,5×23 cm)</option>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Dimensione file (MB)</Label>
                <Input className="mt-1 w-24" value={fileMb} onChange={(e) => setFileMb(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <Label>Piano royalty</Label>
                <Select className="mt-1" value={plan} onChange={(e) => setPlan(Number(e.target.value) as 35 | 70)}>
                  <option value={70}>70%</option>
                  <option value={35}>35%</option>
                </Select>
              </div>
            </>
          )}
        </div>
      </Card>

      {result && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Royalty per copia" value={formatEuroCents(result.royaltyCents)} hint={`${Math.round(result.royaltyRate * 100)}% su prezzo netto IVA`} />
          <Stat label="Prezzo netto (senza IVA 4%)" value={formatEuroCents(result.netPriceCents)} />
          <Stat label={mode === 'kindle' ? 'Costo consegna' : 'Costo di stampa'} value={formatEuroCents(mode === 'kindle' ? result.deliveryCostCents : result.printCostCents)} />
          <Stat label="Margine sul listino" value={`${(result.marginPct * 100).toFixed(1)}%`} hint={result.breakEvenListPriceCents ? `pareggio a ${formatEuroCents(result.breakEvenListPriceCents)}` : undefined} />
        </div>
      )}
      {result?.warnings.map((w) => (
        <Alert key={w} kind="warn">
          {w}
        </Alert>
      ))}
      <Alert kind="info">
        Costi di stampa e aliquote da configurazione interna aggiornata al {KDP_EU_CONFIG.effectiveDate}: verifica i valori correnti su kdp.amazon.com/help
        prima di fissare il prezzo. Sopra i 9,99 € l&apos;aliquota cartaceo passa dal 50% al 60%.
      </Alert>
    </div>
  );
}
