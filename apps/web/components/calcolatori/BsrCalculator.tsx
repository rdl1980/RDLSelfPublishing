'use client';

import {
  BSR_ANCHORS_US,
  estimateDailySales,
  formatEuroCents,
  formatIt,
  IT_MARKET_FACTOR,
  resolveAnchors,
  roundEstimate,
  type BsrStore,
} from '@rdl/core';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { ProfileSettings } from '@/lib/settings';
import { useUser } from '@/lib/use-user';
import { Alert, Button, Card, Input, Label, Select, Stat } from '@/components/ui';
import type { Json } from '@/lib/supabase/database.types';

export function BsrCalculator({ initialSettings }: { initialSettings: ProfileSettings }) {
  const user = useUser();
  const [bsr, setBsr] = useState('5000');
  const [store, setStore] = useState<BsrStore>('books');
  const [price, setPrice] = useState('9,99');
  const [factors, setFactors] = useState({
    books: initialSettings.bsr?.factor?.books ?? IT_MARKET_FACTOR.books,
    kindle: initialSettings.bsr?.factor?.kindle ?? IT_MARKET_FACTOR.kindle,
  });
  const [saved, setSaved] = useState<string | null>(null);

  const anchors = useMemo(() => resolveAnchors({ factor: factors }), [factors]);
  const n = Number(bsr.replace(/\./g, ''));
  const priceCents = Math.round(Number(price.replace(',', '.')) * 100) || 0;
  const daily = estimateDailySales(n, store, anchors);
  const monthly = daily === null ? null : daily * 30;

  const curve = useMemo(() => {
    const pts: { bsr: number; vendite: number }[] = [];
    for (let b = 1; b <= 1_000_000; b = Math.ceil(b * 1.5)) pts.push({ bsr: b, vendite: Number((estimateDailySales(b, store, anchors) ?? 0).toFixed(3)) });
    return pts;
  }, [store, anchors]);

  async function saveFactors() {
    if (!user) return;
    const supabase = createClient();
    const settings: ProfileSettings = { ...initialSettings, bsr: { ...(initialSettings.bsr ?? {}), factor: factors } };
    const { error } = await supabase.from('profiles').update({ settings: settings as unknown as Json }).eq('id', user.id);
    setSaved(error ? `Errore: ${error.message}` : 'Fattori salvati nelle impostazioni');
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>BSR</Label>
            <Input className="mt-1 w-36" value={bsr} onChange={(e) => setBsr(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label>Store</Label>
            <Select className="mt-1" value={store} onChange={(e) => setStore(e.target.value as BsrStore)}>
              <option value="books">Libri</option>
              <option value="kindle">Kindle Store</option>
            </Select>
          </div>
          <div>
            <Label>Prezzo (€)</Label>
            <Input className="mt-1 w-28" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Vendite al giorno (stima)" value={daily === null ? '—' : formatIt(roundEstimate(daily) ?? 0, daily < 10 ? 1 : 0)} />
        <Stat label="Vendite al mese (stima)" value={monthly === null ? '—' : formatIt(roundEstimate(monthly) ?? 0, monthly < 10 ? 1 : 0)} />
        <Stat label="Ricavo lordo mensile" value={monthly === null || !priceCents ? '—' : formatEuroCents(Math.round(monthly * priceCents))} hint="prezzo × copie" />
        <Stat label="Fattore mercato IT" value={factors[store]} hint="rispetto ad amazon.com" />
      </div>

      <Card>
        <h3 className="mb-2 text-sm font-semibold">Curva BSR → vendite/giorno ({store === 'books' ? 'Libri' : 'Kindle'})</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bsr" scale="log" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => formatIt(Number(v))} />
              <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={(v) => String(v)} width={60} />
              <Tooltip formatter={(v) => [formatIt(Number(v), 2), 'vendite/giorno']} labelFormatter={(l) => `BSR ${formatIt(Number(l))}`} />
              <Line type="monotone" dataKey="vendite" stroke="#0f172a" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold">Calibrazione</h3>
        <p className="mb-3 text-sm text-slate-600">
          Le ancore di riferimento sono quelle di amazon.com (es. BSR 1.000 ≈ {BSR_ANCHORS_US.books[3]!.dailySales} copie/giorno) moltiplicate per il
          fattore di mercato italiano. Se conosci le vendite reali di un tuo libro a un certo BSR, regola il fattore finché la stima coincide.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Fattore Libri</Label>
            <Input className="mt-1 w-28" type="number" step="0.01" min="0.01" value={factors.books} onChange={(e) => setFactors({ ...factors, books: Number(e.target.value) || factors.books })} />
          </div>
          <div>
            <Label>Fattore Kindle</Label>
            <Input className="mt-1 w-28" type="number" step="0.01" min="0.01" value={factors.kindle} onChange={(e) => setFactors({ ...factors, kindle: Number(e.target.value) || factors.kindle })} />
          </div>
          <Button variant="secondary" onClick={saveFactors} disabled={!user}>
            Salva nelle impostazioni
          </Button>
          {saved && <span className="text-sm text-slate-600">{saved}</span>}
        </div>
      </Card>
      <Alert kind="info">Stime indicative: il BSR riflette le vendite recenti con una forte componente temporale. Usa gli ordini di grandezza, non i decimali.</Alert>
    </div>
  );
}
