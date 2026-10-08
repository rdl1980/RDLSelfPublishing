'use client';

import {
  dailySalesFromPeriod,
  estimateDailySales,
  fitMarketFactor,
  formatIt,
  IT_MARKET_FACTOR,
  resolveAnchors,
  type BsrStore,
  type CalibrationPoint,
} from '@rdl/core';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Label, Select } from '@/components/ui';
import type { ProfileSettings } from '@/lib/settings';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { useUser } from '@/lib/use-user';

const STORE_LABEL: Record<BsrStore, string> = { books: 'Libri', kindle: 'Kindle Store' };

/**
 * Calibrazione della curva BSR → vendite con i dati reali dei report KDP:
 * per ogni libro si inserisce il BSR medio del periodo e le copie vendute in quei giorni.
 */
export function BsrCalibrationPanel({ initialSettings }: { initialSettings: ProfileSettings }) {
  const user = useUser();
  const router = useRouter();
  const [points, setPoints] = useState<CalibrationPoint[]>(initialSettings.calibration ?? []);
  const [store, setStore] = useState<BsrStore>('books');
  const [label, setLabel] = useState('');
  const [bsr, setBsr] = useState('');
  const [copies, setCopies] = useState('');
  const [days, setDays] = useState('30');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const fits = useMemo(
    () => ({ books: fitMarketFactor(points, 'books'), kindle: fitMarketFactor(points, 'kindle') }),
    [points],
  );
  const currentFactor = {
    books: initialSettings.bsr?.factor?.books ?? IT_MARKET_FACTOR.books,
    kindle: initialSettings.bsr?.factor?.kindle ?? IT_MARKET_FACTOR.kindle,
  };

  function addPoint(e: React.FormEvent) {
    e.preventDefault();
    const b = Number(bsr.replace(/\./g, '').replace(',', '.'));
    const daily = dailySalesFromPeriod(Number(copies.replace(',', '.')), Number(days));
    if (!Number.isFinite(b) || b < 1) return setMsg({ kind: 'error', text: 'BSR non valido' });
    if (daily == null || daily <= 0)
      return setMsg({ kind: 'error', text: 'Inserisci copie vendute (> 0) e giorni (> 0)' });
    setPoints((p) => [
      ...p,
      {
        store,
        bsr: Math.round(b),
        dailySales: Math.round(daily * 1000) / 1000,
        label: label.trim() || undefined,
        date: date || undefined,
      },
    ]);
    setBsr('');
    setCopies('');
    setLabel('');
    setMsg(null);
  }

  async function save(applyFactors: boolean) {
    if (!user) return;
    setMsg(null);
    const factor = { ...(initialSettings.bsr?.factor ?? {}) };
    if (applyFactors) {
      if (fits.books.factor != null) factor.books = fits.books.factor;
      if (fits.kindle.factor != null) factor.kindle = fits.kindle.factor;
    }
    const settings: ProfileSettings = {
      ...initialSettings,
      calibration: points,
      bsr: { ...(initialSettings.bsr ?? {}), factor },
    };
    const { error } = await createClient()
      .from('profiles')
      .update({ settings: settings as unknown as Json })
      .eq('id', user.id);
    if (error) return setMsg({ kind: 'error', text: error.message });
    setMsg({
      kind: 'success',
      text: applyFactors
        ? 'Punti salvati e fattori applicati: tutte le stime usano la nuova curva.'
        : 'Punti salvati.',
    });
    router.refresh();
  }

  const preview = (s: BsrStore, b: number) => {
    const f = fits[s].factor ?? currentFactor[s];
    const v = estimateDailySales(b, s, resolveAnchors({ factor: { [s]: f } }));
    return v == null ? '—' : formatIt(v, v < 10 ? 2 : 0);
  };

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">
        Calibrazione BSR → vendite coi tuoi report KDP
      </h2>
      <p className="mb-3 text-sm text-slate-600">
        Dal report KDP prendi, per un tuo libro, le copie vendute in un periodo (es. 30 giorni) e il
        BSR medio che aveva in quei giorni (lo trovi nello storico del tracking ASIN). Con due o più
        punti il fattore di mercato italiano viene stimato dai dati veri invece del valore
        indicativo di default.
      </p>
      <form onSubmit={addPoint} className="flex flex-wrap items-end gap-2">
        <div>
          <Label>Store</Label>
          <Select
            className="mt-1"
            value={store}
            onChange={(e) => setStore(e.target.value as BsrStore)}
          >
            <option value="books">Libri</option>
            <option value="kindle">Kindle Store</option>
          </Select>
        </div>
        <div>
          <Label>Libro (etichetta)</Label>
          <Input
            className="mt-1 w-44"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="titolo o ASIN"
          />
        </div>
        <div>
          <Label>BSR medio</Label>
          <Input
            className="mt-1 w-28"
            value={bsr}
            onChange={(e) => setBsr(e.target.value)}
            inputMode="numeric"
            placeholder="es. 25000"
            required
          />
        </div>
        <div>
          <Label>Copie vendute</Label>
          <Input
            className="mt-1 w-24"
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            inputMode="numeric"
            placeholder="es. 42"
            required
          />
        </div>
        <div>
          <Label>in giorni</Label>
          <Input
            className="mt-1 w-20"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            inputMode="numeric"
            required
          />
        </div>
        <div>
          <Label>Data</Label>
          <Input
            className="mt-1 w-36"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Aggiungi punto
        </Button>
      </form>

      {points.length > 0 && (
        <div className="mt-4 overflow-auto rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Store</th>
                <th className="px-2 py-1.5 text-left">Libro</th>
                <th className="px-2 py-1.5 text-right">BSR</th>
                <th className="px-2 py-1.5 text-right">Copie/giorno</th>
                <th className="px-2 py-1.5 text-right">Fattore implicato</th>
                <th className="px-2 py-1.5 text-right">Scostamento</th>
                <th className="px-2 py-1.5 text-left">Data</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {points.map((p, i) => {
                const fitPoint = fits[p.store].points.find(
                  (x) => x.bsr === p.bsr && x.dailySales === p.dailySales && x.label === p.label,
                );
                return (
                  <tr key={`${p.store}-${p.bsr}-${i}`}>
                    <td className="px-2 py-1">{STORE_LABEL[p.store]}</td>
                    <td className="px-2 py-1">{p.label ?? '—'}</td>
                    <td className="px-2 py-1 text-right">{formatIt(p.bsr)}</td>
                    <td className="px-2 py-1 text-right">{formatIt(p.dailySales, 2)}</td>
                    <td className="px-2 py-1 text-right">
                      {fitPoint ? fitPoint.impliedFactor.toFixed(3) : '—'}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${fitPoint && Math.abs(fitPoint.residual) > 0.5 ? 'text-amber-700' : ''}`}
                    >
                      {fitPoint
                        ? `${fitPoint.residual > 0 ? '+' : ''}${Math.round(fitPoint.residual * 100)}%`
                        : '—'}
                    </td>
                    <td className="px-2 py-1 text-slate-500">{p.date ?? '—'}</td>
                    <td className="px-2 py-1 text-right">
                      <button
                        className="text-xs text-slate-400 hover:text-red-600"
                        onClick={() => setPoints((ps) => ps.filter((_, j) => j !== i))}
                      >
                        rimuovi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(['books', 'kindle'] as const).map((s) => (
          <div key={s} className="rounded border border-slate-200 p-3 text-sm">
            <div className="font-semibold">{STORE_LABEL[s]}</div>
            <div className="text-slate-600">
              fattore attuale <b>{currentFactor[s]}</b> · stimato dai punti{' '}
              <b>{fits[s].factor != null ? fits[s].factor : '—'}</b> ({fits[s].n} punti
              {fits[s].meanAbsResidual != null
                ? `, errore medio ${Math.round(fits[s].meanAbsResidual * 100)}%`
                : ''}
              )
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Con il fattore stimato: BSR 1.000 → {preview(s, 1000)} copie/giorno · BSR 10.000 →{' '}
              {preview(s, 10_000)} · BSR 100.000 → {preview(s, 100_000)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => save(true)}
          disabled={!user || (fits.books.factor == null && fits.kindle.factor == null)}
        >
          Applica i fattori stimati
        </Button>
        <Button variant="secondary" onClick={() => save(false)} disabled={!user}>
          Salva solo i punti
        </Button>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Con un solo punto la stima è grossolana; con 3-5 libri a BSR diversi diventa affidabile. Un
        punto con scostamento oltre il 50% è probabilmente un periodo anomalo (promozione, lancio):
        toglilo.
      </p>
    </Card>
  );
}
