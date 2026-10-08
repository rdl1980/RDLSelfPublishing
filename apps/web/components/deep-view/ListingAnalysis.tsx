'use client';

import { listingGaps, listingMetrics, termFrequency, type ListingInput } from '@rdl/core';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Card, Select } from '@/components/ui';

export interface ListingRow extends ListingInput {
  position: number;
  isIndependent: boolean | null;
  listingUpdatedAt: string | null;
}

export interface MineOption extends ListingInput {
  label: string;
}

/** Confronto delle inserzioni dei top risultati con un libro tuo: metriche, termini ricorrenti, termini che ti mancano. */
export function ListingAnalysis({ rows, mine }: { rows: ListingRow[]; mine: MineOption[] }) {
  const [mineAsin, setMineAsin] = useState(mine[0]?.asin ?? '');
  const [minShare, setMinShare] = useState(0.3);
  const me = mine.find((m) => m.asin === mineAsin) ?? null;

  const metrics = useMemo(() => rows.map((r) => ({ row: r, m: listingMetrics(r) })), [rows]);
  const withContent = rows.filter((r) => r.description || (r.bullets?.length ?? 0) > 0);
  const titleTerms = useMemo(
    () =>
      termFrequency(
        rows.map((r) => [r.title, r.subtitle].filter(Boolean).join(' ')),
        { max: 25 },
      ),
    [rows],
  );
  const bodyTerms = useMemo(
    () =>
      termFrequency(
        withContent.map((r) => [...(r.bullets ?? []), r.description].filter(Boolean).join(' \n ')),
        { max: 25 },
      ),
    [withContent],
  );
  const gaps = useMemo(
    () => (me ? listingGaps(me, rows, { minShare, max: 40 }) : []),
    [me, rows, minShare],
  );

  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
  const aggregates = {
    titleLength: avg(metrics.map((x) => x.m.titleLength)),
    descriptionWords: avg(
      metrics.filter((x) => x.m.hasDescription).map((x) => x.m.descriptionWords),
    ),
    aplusShare: rows.length
      ? Math.round((100 * rows.filter((r) => r.hasAplus).length) / rows.length)
      : 0,
    withDescription: withContent.length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <div className="text-xs text-slate-500">Lunghezza media titolo</div>
          <div className="text-lg font-semibold">{aggregates.titleLength} caratteri</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Parole medie in descrizione</div>
          <div className="text-lg font-semibold">{aggregates.descriptionWords}</div>
          <div className="text-xs text-slate-400">
            su {aggregates.withDescription} con descrizione raccolta
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Con contenuto A+</div>
          <div className="text-lg font-semibold">{aggregates.aplusShare}%</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Libri analizzati</div>
          <div className="text-lg font-semibold">{rows.length}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-sm font-semibold">Termini più usati nei titoli</h3>
          <div className="flex flex-wrap gap-1">
            {titleTerms.map((t) => (
              <span
                key={t.term}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-xs"
                title={`${t.docs} titoli, ${t.count} occorrenze`}
              >
                {t.term} <span className="text-slate-400">{t.docs}</span>
              </span>
            ))}
            {!titleTerms.length && <span className="text-xs text-slate-400">—</span>}
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-semibold">Termini più usati in bullet e descrizioni</h3>
          <div className="flex flex-wrap gap-1">
            {bodyTerms.map((t) => (
              <span
                key={t.term}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-xs"
                title={`${t.docs} inserzioni, ${t.count} occorrenze`}
              >
                {t.term} <span className="text-slate-400">{t.docs}</span>
              </span>
            ))}
            {!bodyTerms.length && (
              <span className="text-xs text-slate-400">
                Nessuna descrizione raccolta: le inserzioni vengono salvate dai Deep View e dalle
                visite con l’estensione aggiornata.
              </span>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">Cosa manca alla tua inserzione</h3>
          <Select
            value={mineAsin}
            onChange={(e) => setMineAsin(e.target.value)}
            disabled={!mine.length}
          >
            {mine.length ? (
              mine.map((m) => (
                <option key={m.asin} value={m.asin}>
                  {m.label}
                </option>
              ))
            ) : (
              <option value="">nessun libro tuo (segna «è un mio libro» nel tracking ASIN)</option>
            )}
          </Select>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            usato da almeno
            <Select value={minShare} onChange={(e) => setMinShare(Number(e.target.value))}>
              {[0.2, 0.3, 0.5, 0.7].map((v) => (
                <option key={v} value={v}>
                  {Math.round(v * 100)}%
                </option>
              ))}
            </Select>
            dei concorrenti
          </label>
        </div>
        {me ? (
          gaps.length ? (
            <div className="flex flex-wrap gap-1">
              {gaps.map((g) => (
                <span
                  key={g.term}
                  className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-900"
                  title={`usato da ${g.docs} concorrenti`}
                >
                  {g.term} <span className="text-amber-600">{Math.round(g.share * 100)}%</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nessun termine ricorrente tra i concorrenti manca nella tua inserzione a questa
              soglia.
            </p>
          )
        ) : (
          <p className="text-sm text-slate-500">
            Aggiungi un tuo libro al{' '}
            <Link href="/tracking/asin" className="underline">
              tracking ASIN
            </Link>{' '}
            con «è un mio libro» e visita la sua pagina su amazon.it con l’estensione: comparirà
            qui.
          </p>
        )}
      </Card>

      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-left">#</th>
              <th className="px-2 py-1.5 text-left">Titolo</th>
              <th className="px-2 py-1.5 text-right">Caratteri titolo</th>
              <th className="px-2 py-1.5 text-right">Parole titolo</th>
              <th className="px-2 py-1.5 text-right">Bullet</th>
              <th className="px-2 py-1.5 text-right">Parole descr.</th>
              <th className="px-2 py-1.5 text-right">A+</th>
              <th className="px-2 py-1.5 text-left">Inserzione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {metrics.map(({ row, m }) => (
              <tr key={row.asin}>
                <td className="px-2 py-1 text-slate-500">{row.position}</td>
                <td className="max-w-md px-2 py-1">
                  <Link
                    href={`/prodotti/${row.asin}`}
                    className="line-clamp-2 font-medium hover:underline"
                  >
                    {row.title ?? row.asin}
                  </Link>
                  <span className="font-mono text-[10px] text-slate-400">{row.asin}</span>{' '}
                  {row.isIndependent && <Badge tone="good">KDP</Badge>}
                </td>
                <td className="px-2 py-1 text-right">{m.titleLength}</td>
                <td className="px-2 py-1 text-right">{m.titleWords}</td>
                <td className="px-2 py-1 text-right">{m.bulletsCount || '—'}</td>
                <td className="px-2 py-1 text-right">
                  {m.hasDescription ? m.descriptionWords : '—'}
                </td>
                <td className="px-2 py-1 text-right">
                  {m.hasAplus ? (m.aplusModules != null ? `${m.aplusModules} mod.` : 'sì') : '—'}
                </td>
                <td className="px-2 py-1 text-slate-500">
                  {row.listingUpdatedAt
                    ? new Date(row.listingUpdatedAt).toLocaleDateString('it-IT')
                    : 'non raccolta'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
