'use client';

import { buildSearchUrl, toCsv, type SearchAlias } from '@rdl/core';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { downloadText, safeFilename } from '@/lib/download';
import { addKeywordToNiche, trackKeyword } from '@/lib/keywords';
import { useUser } from '@/lib/use-user';
import { Alert, Button, Input, Select } from '@/components/ui';
import { KdpKeywordsPanel } from './KdpKeywordsPanel';

export interface SuggestionRow {
  value: string;
  normalized: string;
  sourceQuery: string;
  position: number;
}

export interface NicheOption {
  id: string;
  name: string;
}

type SortKey = 'value' | 'sourceQuery' | 'position';

export function SuggestionsTable({
  rows,
  alias,
  niches,
  exportName,
}: {
  rows: SuggestionRow[];
  alias: SearchAlias;
  niches: NicheOption[];
  exportName: string;
}) {
  const user = useUser();
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'position', dir: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nicheId, setNicheId] = useState(niches[0]?.id ?? '');
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showKdp, setShowKdp] = useState(false);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = f ? rows.filter((r) => r.normalized.includes(f) || r.sourceQuery.includes(f)) : rows;
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'it');
      return c * sort.dir;
    });
  }, [rows, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const toggle = (n: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.normalized));
  const chosen = () => (selected.size ? rows.filter((r) => selected.has(r.normalized)) : visible);

  async function withBusy(fn: () => Promise<string>) {
    if (!user) return;
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ kind: 'success', text: await fn() });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const exportCsv = () => {
    const csv = toCsv(chosen(), [
      { key: 'value', label: 'Keyword' },
      { key: 'sourceQuery', label: 'Query di origine' },
      { key: 'position', label: 'Posizione' },
      { key: 'url', label: 'URL Amazon', format: (r) => buildSearchUrl(r.value, alias) },
    ]);
    downloadText(`${safeFilename(exportName)}.csv`, csv);
  };

  const track = () =>
    withBusy(async () => {
      const supabase = createClient();
      const list = chosen();
      for (const r of list) await trackKeyword(supabase, user!.id, r.value, alias);
      return `${list.length} keyword aggiunte al tracking`;
    });

  const toNiche = () =>
    withBusy(async () => {
      if (!nicheId) throw new Error('Scegli una nicchia');
      const supabase = createClient();
      const list = chosen();
      for (const r of list) await addKeywordToNiche(supabase, user!.id, nicheId, r.value);
      return `${list.length} keyword aggiunte alla nicchia`;
    });

  const th = (key: SortKey, label: string) => (
    <th className="cursor-pointer px-2 py-1.5 text-left select-none" onClick={() => toggleSort(key)}>
      {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Filtra…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56" />
        <span className="text-sm text-slate-500">
          {visible.length} di {rows.length} · selezionate {selected.size}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
            Esporta CSV
          </Button>
          <Button variant="secondary" onClick={track} disabled={busy || !rows.length || !user}>
            Traccia
          </Button>
          <Select value={nicheId} onChange={(e) => setNicheId(e.target.value)} disabled={!niches.length}>
            {niches.length ? niches.map((n) => <option key={n.id} value={n.id}>{n.name}</option>) : <option value="">Nessuna nicchia</option>}
          </Select>
          <Button variant="secondary" onClick={toNiche} disabled={busy || !rows.length || !nicheId || !user}>
            Aggiungi a nicchia
          </Button>
          <Button variant="secondary" onClick={() => setShowKdp((v) => !v)} disabled={!rows.length}>
            {showKdp ? 'Nascondi campi KDP' : '7 campi KDP'}
          </Button>
        </div>
      </div>
      {showKdp && (
        <KdpKeywordsPanel
          candidates={chosen().map((r) => ({ phrase: r.value, weight: 1 / Math.max(1, r.position) + (selected.has(r.normalized) ? 1 : 0) }))}
        />
      )}
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <p className="text-xs text-slate-500">Le azioni si applicano alle righe selezionate, oppure a tutte quelle visibili se non ne hai selezionata nessuna.</p>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (allVisibleSelected) visible.forEach((r) => next.delete(r.normalized));
                      else visible.forEach((r) => next.add(r.normalized));
                      return next;
                    })
                  }
                />
              </th>
              {th('value', 'Keyword')}
              {th('sourceQuery', 'Query di origine')}
              {th('position', 'Pos.')}
              <th className="px-2 py-1.5 text-left">Amazon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={r.normalized} className={selected.has(r.normalized) ? 'bg-amber-50' : ''}>
                <td className="px-2 py-1 text-center">
                  <input type="checkbox" checked={selected.has(r.normalized)} onChange={() => toggle(r.normalized)} />
                </td>
                <td className="px-2 py-1 font-medium">{r.value}</td>
                <td className="px-2 py-1 text-slate-500">{r.sourceQuery}</td>
                <td className="px-2 py-1 text-slate-500">{r.position}</td>
                <td className="px-2 py-1">
                  <a href={buildSearchUrl(r.value, alias)} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    apri ↗
                  </a>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                  Nessun suggerimento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
