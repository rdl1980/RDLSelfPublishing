'use client';

import { daysSince, formatEuroCents, formatIt, productUrl, roundEstimate, toCsv } from '@rdl/core';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { downloadText, safeFilename } from '@/lib/download';

export interface DeepViewRow {
  position: number;
  page: number;
  asin: string;
  title: string | null;
  author: string | null;
  format: string | null;
  priceCents: number | null;
  rating: number | null;
  reviews: number | null;
  bsr: number | null;
  monthlySales: number | null;
  monthlyRevenueCents: number | null;
  pages: number | null;
  publisher: string | null;
  isIndependent: boolean | null;
  pubDate: string | null;
  hasAplus: boolean | null;
  isSponsored: boolean;
  imageUrl: string | null;
}

type Key = keyof DeepViewRow;

export function DeepViewTable({ rows, keyword }: { rows: DeepViewRow[]; keyword: string }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'position', dir: 1 });
  const [onlyKdp, setOnlyKdp] = useState(false);
  const [hideSponsored, setHideSponsored] = useState(false);

  const visible = useMemo(() => {
    let list = rows;
    if (onlyKdp) list = list.filter((r) => r.isIndependent);
    if (hideSponsored) list = list.filter((r) => !r.isSponsored);
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'it');
      return c * sort.dir;
    });
  }, [rows, sort, onlyKdp, hideSponsored]);

  const th = (key: Key, label: string, align = 'left') => (
    <th
      className={`cursor-pointer whitespace-nowrap px-2 py-1.5 text-${align} select-none`}
      onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))}
    >
      {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
    </th>
  );

  const exportCsv = () =>
    downloadText(
      `deepview_${safeFilename(keyword)}.csv`,
      toCsv(visible, [
        { key: 'position', label: 'Pos.' },
        { key: 'asin', label: 'ASIN' },
        { key: 'title', label: 'Titolo' },
        { key: 'author', label: 'Autore' },
        { key: 'format', label: 'Formato' },
        { key: 'price', label: 'Prezzo €', format: (r) => (r.priceCents == null ? '' : r.priceCents / 100) },
        { key: 'rating', label: 'Rating' },
        { key: 'reviews', label: 'Recensioni' },
        { key: 'bsr', label: 'BSR' },
        { key: 'monthlySales', label: 'Vendite/mese (stima)', format: (r) => (r.monthlySales == null ? '' : Math.round(r.monthlySales)) },
        { key: 'rev', label: 'Ricavo/mese € (stima)', format: (r) => (r.monthlyRevenueCents == null ? '' : r.monthlyRevenueCents / 100) },
        { key: 'pages', label: 'Pagine' },
        { key: 'publisher', label: 'Editore' },
        { key: 'isIndependent', label: 'KDP' },
        { key: 'pubDate', label: 'Pubblicato' },
        { key: 'hasAplus', label: 'A+' },
        { key: 'isSponsored', label: 'Sponsorizzato' },
        { key: 'url', label: 'URL', format: (r) => productUrl(r.asin) },
      ]),
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">
          {visible.length} di {rows.length} risultati
        </span>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={onlyKdp} onChange={(e) => setOnlyKdp(e.target.checked)} /> solo KDP
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hideSponsored} onChange={(e) => setHideSponsored(e.target.checked)} /> nascondi sponsorizzati
        </label>
        <Button variant="secondary" className="ml-auto" onClick={exportCsv} disabled={!rows.length}>
          Esporta CSV
        </Button>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 uppercase text-slate-500">
            <tr>
              {th('position', '#')}
              <th className="px-2 py-1.5"></th>
              {th('title', 'Titolo')}
              {th('format', 'Form.')}
              {th('priceCents', 'Prezzo', 'right')}
              {th('rating', '★', 'right')}
              {th('reviews', 'Rec.', 'right')}
              {th('bsr', 'BSR', 'right')}
              {th('monthlySales', 'Vend./mese', 'right')}
              {th('monthlyRevenueCents', 'Ricavo/mese', 'right')}
              {th('pages', 'Pag.', 'right')}
              {th('publisher', 'Editore')}
              {th('pubDate', 'Pubbl.')}
              <th className="px-2 py-1.5">Età</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => (
              <tr key={`${r.asin}-${r.position}`} className={r.isSponsored ? 'bg-amber-50/50' : ''}>
                <td className="px-2 py-1 text-slate-500">{r.position}</td>
                <td className="px-2 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.imageUrl && <img src={r.imageUrl} alt="" className="h-10 w-7 rounded object-cover" />}
                </td>
                <td className="max-w-md px-2 py-1">
                  <Link href={`/prodotti/${r.asin}`} className="line-clamp-2 font-medium hover:underline">
                    {r.title ?? r.asin}
                  </Link>
                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                    <a href={productUrl(r.asin)} target="_blank" rel="noreferrer" className="font-mono hover:underline">
                      {r.asin}
                    </a>
                    {r.author && <span>· {r.author}</span>}
                    {r.isSponsored && <Badge tone="warn">sponsor</Badge>}
                    {r.hasAplus && <Badge tone="warn">A+</Badge>}
                  </div>
                </td>
                <td className="px-2 py-1">{r.format ?? '—'}</td>
                <td className="px-2 py-1 text-right">{r.priceCents == null ? '—' : formatEuroCents(r.priceCents)}</td>
                <td className="px-2 py-1 text-right">{r.rating ?? '—'}</td>
                <td className="px-2 py-1 text-right">{r.reviews == null ? '—' : formatIt(r.reviews)}</td>
                <td className="px-2 py-1 text-right">{r.bsr == null ? '—' : formatIt(r.bsr)}</td>
                <td className="px-2 py-1 text-right">{r.monthlySales == null ? '—' : formatIt(roundEstimate(r.monthlySales) ?? 0)}</td>
                <td className="px-2 py-1 text-right">{r.monthlyRevenueCents == null ? '—' : formatEuroCents(r.monthlyRevenueCents)}</td>
                <td className="px-2 py-1 text-right">{r.pages ?? '—'}</td>
                <td className="max-w-[10rem] truncate px-2 py-1">
                  {r.isIndependent ? <Badge tone="good">KDP</Badge> : (r.publisher ?? '—')}
                </td>
                <td className="whitespace-nowrap px-2 py-1">{r.pubDate ?? '—'}</td>
                <td className="px-2 py-1 text-right text-slate-500">{r.pubDate ? `${daysSince(r.pubDate)} gg` : '—'}</td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={14} className="px-2 py-6 text-center text-slate-400">
                  In attesa dei dati dall’estensione…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
