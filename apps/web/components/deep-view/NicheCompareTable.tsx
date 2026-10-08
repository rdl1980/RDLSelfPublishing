'use client';

import { formatEuroCents, formatIt, roundEstimate, toCsv } from '@rdl/core';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button, Input } from '@/components/ui';
import { downloadText } from '@/lib/download';

export interface NicheCompareRow {
  id: string;
  keyword: string;
  alias: string;
  pages: number;
  createdAt: string;
  score: number | null;
  demand: number | null;
  competition: number | null;
  resultCount: number;
  sponsoredCount: number;
  independentShare: number | null;
  medianPriceCents: number | null;
  medianReviews: number | null;
  lowReviewShare: number | null;
  medianBsr: number | null;
  salesTop10: number | null;
  revenueTop10Cents: number | null;
  newBooksShare: number | null;
  aplusShare: number | null;
}

type Key = keyof NicheCompareRow;

const pct = (x: number | null) => (x == null ? '—' : `${Math.round(x * 100)}%`);
const num = (x: number | null, d = 0) => (x == null ? '—' : formatIt(x, d));

/** Tabella di confronto tra le nicchie analizzate con Deep View: ordinabile, filtrabile, esportabile. */
export function NicheCompareTable({ rows }: { rows: NicheCompareRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'score', dir: -1 });
  const [filter, setFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [onlyLatest, setOnlyLatest] = useState(true);

  const visible = useMemo(() => {
    let list = rows;
    if (onlyLatest) {
      // una riga per keyword+catalogo: l'analisi più recente
      const seen = new Set<string>();
      list = [...rows]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .filter((r) => {
          const k = `${r.keyword}|${r.alias}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
    }
    const f = filter.trim().toLowerCase();
    if (f) list = list.filter((r) => r.keyword.toLowerCase().includes(f));
    if (minScore > 0) list = list.filter((r) => (r.score ?? 0) >= minScore);
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const c =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'it');
      return c * sort.dir;
    });
  }, [rows, sort, filter, minScore, onlyLatest]);

  const th = (key: Key, label: string, align: 'left' | 'right' = 'right', title?: string) => (
    <th
      title={title}
      className={`cursor-pointer whitespace-nowrap px-2 py-1.5 text-${align} select-none`}
      onClick={() =>
        setSort((s) =>
          s.key === key
            ? { key, dir: s.dir === 1 ? -1 : 1 }
            : { key, dir: align === 'left' ? 1 : -1 },
        )
      }
    >
      {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
    </th>
  );

  const exportCsv = () =>
    downloadText(
      'confronto_nicchie.csv',
      toCsv(visible, [
        { key: 'keyword', label: 'Keyword' },
        { key: 'alias', label: 'Catalogo' },
        { key: 'score', label: 'Punteggio' },
        {
          key: 'salesTop10',
          label: 'Vendite/mese top 10',
          format: (r) => (r.salesTop10 == null ? '' : Math.round(r.salesTop10)),
        },
        {
          key: 'rev',
          label: 'Ricavo/mese top 10 €',
          format: (r) => (r.revenueTop10Cents == null ? '' : r.revenueTop10Cents / 100),
        },
        { key: 'medianReviews', label: 'Recensioni mediane' },
        {
          key: 'lowReviewShare',
          label: 'Quota ≤20 rec.',
          format: (r) => (r.lowReviewShare == null ? '' : Math.round(r.lowReviewShare * 100)),
        },
        {
          key: 'price',
          label: 'Prezzo mediano €',
          format: (r) => (r.medianPriceCents == null ? '' : r.medianPriceCents / 100),
        },
        {
          key: 'kdp',
          label: 'Quota KDP %',
          format: (r) => (r.independentShare == null ? '' : Math.round(r.independentShare * 100)),
        },
        {
          key: 'new',
          label: 'Nuovi <1 anno %',
          format: (r) => (r.newBooksShare == null ? '' : Math.round(r.newBooksShare * 100)),
        },
        {
          key: 'aplus',
          label: 'A+ %',
          format: (r) => (r.aplusShare == null ? '' : Math.round(r.aplusShare * 100)),
        },
        {
          key: 'medianBsr',
          label: 'BSR mediano',
          format: (r) => (r.medianBsr == null ? '' : Math.round(r.medianBsr)),
        },
        { key: 'resultCount', label: 'Risultati' },
        { key: 'sponsoredCount', label: 'Sponsorizzati' },
        { key: 'createdAt', label: 'Data', format: (r) => r.createdAt.slice(0, 10) },
      ]),
    );

  const tone = (s: number | null) =>
    s == null ? 'neutral' : s >= 70 ? 'good' : s >= 45 ? 'warn' : 'bad';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Input
          placeholder="Filtra keyword…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-56"
        />
        <label className="flex items-center gap-1">
          punteggio ≥
          <Input
            type="number"
            min={0}
            max={100}
            className="w-16"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={onlyLatest}
            onChange={(e) => setOnlyLatest(e.target.checked)}
          />{' '}
          solo l&apos;analisi più recente per keyword
        </label>
        <span className="text-slate-500">
          {visible.length} di {rows.length}
        </span>
        <Button
          variant="secondary"
          className="ml-auto"
          onClick={exportCsv}
          disabled={!visible.length}
        >
          Esporta CSV
        </Button>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 uppercase text-slate-500">
            <tr>
              {th('keyword', 'Keyword', 'left')}
              {th('score', 'Punt.', 'right', 'Punteggio nicchia 0-100')}
              {th(
                'salesTop10',
                'Vend./mese top 10',
                'right',
                'Vendite mensili stimate dei primi 10 organici',
              )}
              {th('revenueTop10Cents', 'Ricavo/mese top 10')}
              {th('medianReviews', 'Rec. mediane')}
              {th(
                'lowReviewShare',
                '≤20 rec.',
                'right',
                'Quota di titoli con al massimo 20 recensioni',
              )}
              {th('medianPriceCents', 'Prezzo med.')}
              {th('independentShare', 'KDP')}
              {th(
                'newBooksShare',
                'Nuovi',
                'right',
                'Quota di titoli pubblicati da meno di un anno',
              )}
              {th('aplusShare', 'A+')}
              {th('medianBsr', 'BSR med.')}
              {th('resultCount', 'Ris.')}
              {th('createdAt', 'Data', 'left')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-1">
                  <Link href={`/deep-view/${r.id}`} className="font-medium hover:underline">
                    {r.keyword}
                  </Link>
                  <span className="ml-1 text-[10px] text-slate-400">
                    {r.alias === 'digital-text' ? 'Kindle' : 'Libri'} · {r.pages} pag.
                  </span>
                </td>
                <td className="px-2 py-1 text-right">
                  <Badge tone={tone(r.score)}>{r.score ?? '—'}</Badge>
                </td>
                <td className="px-2 py-1 text-right">
                  {r.salesTop10 == null ? '—' : formatIt(roundEstimate(r.salesTop10) ?? 0)}
                </td>
                <td className="px-2 py-1 text-right">
                  {r.revenueTop10Cents == null ? '—' : formatEuroCents(r.revenueTop10Cents)}
                </td>
                <td className="px-2 py-1 text-right">{num(r.medianReviews)}</td>
                <td className="px-2 py-1 text-right">{pct(r.lowReviewShare)}</td>
                <td className="px-2 py-1 text-right">
                  {r.medianPriceCents == null ? '—' : formatEuroCents(r.medianPriceCents)}
                </td>
                <td className="px-2 py-1 text-right">{pct(r.independentShare)}</td>
                <td className="px-2 py-1 text-right">{pct(r.newBooksShare)}</td>
                <td className="px-2 py-1 text-right">{pct(r.aplusShare)}</td>
                <td className="px-2 py-1 text-right">
                  {r.medianBsr == null ? '—' : formatIt(Math.round(r.medianBsr))}
                </td>
                <td className="px-2 py-1 text-right">
                  {r.resultCount}
                  {r.sponsoredCount > 0 && (
                    <span className="text-slate-400"> ({r.sponsoredCount} sp.)</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-slate-500">
                  {new Date(r.createdAt).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={13} className="px-2 py-6 text-center text-slate-400">
                  Nessun Deep View completato da confrontare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Come leggerla: domanda alta (vendite top 10) con recensioni mediane basse e quota KDP alta è
        la combinazione migliore. Il punteggio pesa domanda 35%, concorrenza 25%, KDP 15%, novità
        15%, prezzo 10%.
      </p>
    </div>
  );
}
