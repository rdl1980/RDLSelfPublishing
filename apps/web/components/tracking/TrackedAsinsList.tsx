'use client';

import { extractAsin, formatEuroCents, formatIt } from '@rdl/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';

export interface TrackedAsinRow {
  id: string;
  asin: string;
  label: string | null;
  isMine: boolean;
  active: boolean;
  lastRunAt: string | null;
  title: string | null;
  imageUrl: string | null;
  isIndependent: boolean | null;
  bsr: number | null;
  bsrPrev: number | null;
  priceCents: number | null;
  reviews: number | null;
  rating: number | null;
  dailySales: number | null;
  capturedAt: string | null;
}

export function TrackedAsinsList({ rows }: { rows: TrackedAsinRow[] }) {
  const user = useUser();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [label, setLabel] = useState('');
  const [mine, setMine] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const asin = extractAsin(input);
    if (!user || !asin) return setMsg('ASIN o URL non valido');
    const { error } = await createClient().from('tracked_asins').upsert({ user_id: user.id, asin, label: label || null, is_mine: mine, active: true }, { onConflict: 'user_id,asin' });
    if (error) return setMsg(error.message);
    setInput('');
    setLabel('');
    setMsg(null);
    router.refresh();
  }
  async function toggle(r: TrackedAsinRow) {
    await createClient().from('tracked_asins').update({ active: !r.active }).eq('id', r.id);
    router.refresh();
  }
  async function remove(r: TrackedAsinRow) {
    if (!confirm(`Rimuovere ${r.asin} dal tracking?`)) return;
    await createClient().from('tracked_asins').delete().eq('id', r.id);
    router.refresh();
  }

  const delta = (r: TrackedAsinRow) => {
    if (r.bsr == null || r.bsrPrev == null) return null;
    const d = r.bsrPrev - r.bsr;
    if (d === 0) return <span className="text-slate-400">=</span>;
    return <span className={d > 0 ? 'text-green-700' : 'text-red-600'}>{d > 0 ? '▲' : '▼'} {formatIt(Math.abs(d))}</span>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <Input className="w-64" placeholder="ASIN o URL amazon.it" value={input} onChange={(e) => setInput(e.target.value)} />
          <Input className="w-56" placeholder="Etichetta (opzionale)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> è un mio libro
          </label>
          <Button type="submit" disabled={!user || !input.trim()}>
            Aggiungi
          </Button>
          {msg && <span className="text-sm text-red-600">{msg}</span>}
        </form>
      </Card>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2 text-left">Libro</th>
              <th className="px-3 py-2 text-right">BSR</th>
              <th className="px-3 py-2 text-right">Δ vs prec.</th>
              <th className="px-3 py-2 text-right">Vend./giorno</th>
              <th className="px-3 py-2 text-right">Prezzo</th>
              <th className="px-3 py-2 text-right">Recensioni</th>
              <th className="px-3 py-2 text-left">Rilevato</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.imageUrl && <img src={r.imageUrl} alt="" className="h-10 w-7 rounded object-cover" />}
                </td>
                <td className="max-w-md px-3 py-1.5">
                  <Link href={`/tracking/asin/${r.asin}`} className="line-clamp-1 font-medium hover:underline">
                    {r.title ?? r.label ?? r.asin}
                  </Link>
                  <div className="flex gap-1 text-[10px] text-slate-400">
                    <span className="font-mono">{r.asin}</span>
                    {r.label && r.title && <span>· {r.label}</span>}
                    {r.isMine && <Badge tone="good">mio</Badge>}
                    {r.isIndependent && <Badge>KDP</Badge>}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">{r.bsr == null ? '—' : formatIt(r.bsr)}</td>
                <td className="px-3 py-1.5 text-right text-xs">{delta(r) ?? '—'}</td>
                <td className="px-3 py-1.5 text-right">{r.dailySales == null ? '—' : formatIt(r.dailySales, 1)}</td>
                <td className="px-3 py-1.5 text-right">{r.priceCents == null ? '—' : formatEuroCents(r.priceCents)}</td>
                <td className="px-3 py-1.5 text-right">
                  {r.reviews == null ? '—' : formatIt(r.reviews)}
                  {r.rating != null && <span className="text-xs text-slate-400"> · {r.rating}★</span>}
                </td>
                <td className="px-3 py-1.5 text-xs text-slate-500">{r.capturedAt ? new Date(r.capturedAt).toLocaleString('it-IT') : 'mai'}</td>
                <td className="px-3 py-1.5">
                  <button onClick={() => toggle(r)}>{r.active ? <Badge tone="good">attivo</Badge> : <Badge>in pausa</Badge>}</button>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Button variant="ghost" onClick={() => remove(r)}>
                    Rimuovi
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  Nessun ASIN tracciato. Aggiungine uno qui o con «Traccia ASIN» dall’estensione.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
