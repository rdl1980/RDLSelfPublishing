'use client';

import { buildSearchUrl, extractAsin, type SearchAlias } from '@rdl/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { trackKeyword } from '@/lib/keywords';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';

export interface TrackedKeywordRow {
  id: string;
  keyword: string;
  alias: string;
  pages: number;
  watchAsins: string[];
  active: boolean;
  lastRunAt: string | null;
}

export function TrackedKeywordsList({ rows }: { rows: TrackedKeywordRow[] }) {
  const user = useUser();
  const router = useRouter();
  const [kw, setKw] = useState('');
  const [asinInput, setAsinInput] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !kw.trim()) return;
    try {
      await trackKeyword(createClient(), user.id, kw);
      setKw('');
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }
  async function toggle(r: TrackedKeywordRow) {
    await createClient().from('tracked_keywords').update({ active: !r.active }).eq('id', r.id);
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm('Rimuovere la keyword dal tracking (lo storico viene eliminato)?')) return;
    await createClient().from('tracked_keywords').delete().eq('id', id);
    router.refresh();
  }
  async function addAsin(r: TrackedKeywordRow) {
    const asin = extractAsin(asinInput[r.id] ?? '');
    if (!asin) return setMsg('ASIN non valido');
    const next = Array.from(new Set([...r.watchAsins, asin]));
    await createClient().from('tracked_keywords').update({ watch_asins: next }).eq('id', r.id);
    setAsinInput({ ...asinInput, [r.id]: '' });
    router.refresh();
  }
  async function removeAsin(r: TrackedKeywordRow, asin: string) {
    await createClient().from('tracked_keywords').update({ watch_asins: r.watchAsins.filter((a) => a !== asin) }).eq('id', r.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} className="flex items-center gap-2">
          <Input className="w-80" placeholder="Keyword da tracciare" value={kw} onChange={(e) => setKw(e.target.value)} />
          <Button type="submit" disabled={!user || !kw.trim()}>
            Aggiungi
          </Button>
          {msg && <span className="text-sm text-red-600">{msg}</span>}
        </form>
      </Card>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Keyword</th>
              <th className="px-3 py-2 text-left">ASIN osservati</th>
              <th className="px-3 py-2 text-left">Ultimo run</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <a href={buildSearchUrl(r.keyword, r.alias as SearchAlias)} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {r.keyword}
                  </a>
                  <div className="text-xs text-slate-400">
                    {r.alias} · {r.pages} pagine
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.watchAsins.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                        {a}
                        <button className="text-slate-400 hover:text-red-600" onClick={() => removeAsin(r, a)} title="rimuovi">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Input className="w-40 py-0.5 text-xs" placeholder="ASIN" value={asinInput[r.id] ?? ''} onChange={(e) => setAsinInput({ ...asinInput, [r.id]: e.target.value })} />
                    <Button variant="ghost" className="py-0.5 text-xs" onClick={() => addAsin(r)}>
                      +
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500">{r.lastRunAt ? new Date(r.lastRunAt).toLocaleString('it-IT') : 'mai'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggle(r)}>{r.active ? <Badge tone="good">attivo</Badge> : <Badge>in pausa</Badge>}</button>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" onClick={() => remove(r.id)}>
                    Rimuovi
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Nessuna keyword tracciata
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
