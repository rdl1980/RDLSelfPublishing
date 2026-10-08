'use client';

import { buildSearchUrl, formatIt, toCsv, type SearchAlias } from '@rdl/core';
import { useMemo, useState } from 'react';
import { Badge, Button, Input } from '@/components/ui';
import { downloadText } from '@/lib/download';

export interface CompetitorKeywordRow {
  keyword: string;
  checked: number;
  found: number;
  organicFound: number;
  foundAsins: { asin: string; position: number | null; organic: boolean }[];
  bestPosition: number | null;
  avgPosition: number | null;
  totalResultsEst: number | null;
}

export function CompetitorKeywordsTable({
  rows,
  titles,
  alias,
  totalBooks,
}: {
  rows: CompetitorKeywordRow[];
  titles: Record<string, string>;
  alias: SearchAlias;
  totalBooks: number;
}) {
  const [filter, setFilter] = useState('');
  const [onlyFound, setOnlyFound] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return rows.filter((r) => (!f || r.keyword.includes(f)) && (!onlyFound || r.found > 0));
  }, [rows, filter, onlyFound]);

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const chosen = () => (selected.size ? rows.filter((r) => selected.has(r.keyword)) : visible);
  const exportCsv = () =>
    downloadText(
      'keyword_concorrenti.csv',
      toCsv(chosen(), [
        { key: 'keyword', label: 'Keyword' },
        { key: 'found', label: 'Libri posizionati' },
        { key: 'checked', label: 'Libri verificati' },
        { key: 'organicFound', label: 'di cui organici' },
        { key: 'bestPosition', label: 'Miglior posizione' },
        {
          key: 'avg',
          label: 'Posizione media',
          format: (r) => (r.avgPosition == null ? '' : Math.round(r.avgPosition)),
        },
        { key: 'totalResultsEst', label: 'Risultati totali' },
        { key: 'asins', label: 'ASIN', format: (r) => r.foundAsins.map((a) => a.asin).join(' ') },
      ]),
    );
  const copyList = async () => {
    await navigator.clipboard.writeText(
      chosen()
        .map((r) => r.keyword)
        .join('\n'),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Input
          placeholder="Filtra…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-48"
        />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={onlyFound}
            onChange={(e) => setOnlyFound(e.target.checked)}
          />{' '}
          solo keyword con almeno un libro
        </label>
        <span className="text-slate-500">
          {visible.length} keyword · selezionate {selected.size}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={copyList} disabled={!rows.length}>
            Copia lista
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
            Esporta CSV
          </Button>
        </div>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5"></th>
              <th className="px-2 py-1.5 text-left">Keyword</th>
              <th
                className="px-2 py-1.5 text-right"
                title="Quanti dei libri osservati compaiono nelle pagine verificate"
              >
                Libri posizionati
              </th>
              <th className="px-2 py-1.5 text-right">Migliore</th>
              <th className="px-2 py-1.5 text-right">Media</th>
              <th className="px-2 py-1.5 text-right">Risultati</th>
              <th className="px-2 py-1.5 text-left">Chi si posiziona</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => {
              const share = totalBooks ? r.found / totalBooks : 0;
              return (
                <tr key={r.keyword} className={selected.has(r.keyword) ? 'bg-amber-50' : ''}>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(r.keyword)}
                      onChange={() => toggle(r.keyword)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <a
                      href={buildSearchUrl(r.keyword, alias)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      {r.keyword}
                    </a>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <Badge tone={share >= 0.5 ? 'good' : share > 0 ? 'warn' : 'neutral'}>
                      {r.found}/{r.checked}
                    </Badge>
                    {r.organicFound < r.found && (
                      <span className="ml-1 text-xs text-slate-400">({r.organicFound} org.)</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">{r.bestPosition ?? '—'}</td>
                  <td className="px-2 py-1 text-right">
                    {r.avgPosition == null ? '—' : Math.round(r.avgPosition)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {r.totalResultsEst == null ? '—' : formatIt(r.totalResultsEst)}
                  </td>
                  <td className="max-w-md px-2 py-1 text-xs text-slate-600">
                    {r.foundAsins
                      .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
                      .map((a) => (
                        <span
                          key={a.asin}
                          className="mr-2 inline-block"
                          title={titles[a.asin] ?? a.asin}
                        >
                          <span className="font-mono">{a.asin}</span>
                          {a.position != null && (
                            <span className="text-slate-400"> #{a.position}</span>
                          )}
                          {!a.organic && <span className="text-amber-700"> sp.</span>}
                        </span>
                      ))}
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-slate-400">
                  Nessun risultato ancora: l’estensione sta verificando le keyword.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
