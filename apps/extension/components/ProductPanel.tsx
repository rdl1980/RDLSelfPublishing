import { BSR_ANCHORS_IT, formatIt, printRoyalty, type BsrAnchor, type BsrStore, type ParsedProduct } from '@rdl/core';
import { useEffect, useState } from 'react';
import { computeEstimates, fmtEuro, fmtInt, fmtSales } from '@/lib/estimates';
import { sendMessage } from '@/lib/messages';
import { DEFAULT_SETTINGS, type ExtSettings } from '@/lib/settings';

function Row({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-semibold text-slate-900">
        {v}
        {hint && <span className="ml-1 text-[10px] font-normal text-slate-400">{hint}</span>}
      </span>
    </div>
  );
}

export function ProductPanel({ parsed }: { parsed: ParsedProduct }) {
  const { product, snapshot } = parsed;
  const [anchors, setAnchors] = useState<Record<BsrStore, BsrAnchor[]>>(BSR_ANCHORS_IT);
  const [settings, setSettings] = useState<ExtSettings>(DEFAULT_SETTINGS);
  const [ink, setInk] = useState<'bw' | 'premium_color'>('bw');
  const [tracked, setTracked] = useState<boolean | null>(null);
  const [trackMsg, setTrackMsg] = useState<string | null>(null);
  const [synced, setSynced] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const [cfg, sett] = await Promise.all([sendMessage({ type: 'config:get' }).catch(() => null), sendMessage({ type: 'settings:get' }).catch(() => DEFAULT_SETTINGS)]);
      if (cfg?.anchors) setAnchors(cfg.anchors);
      setSettings(sett);
      if (/^[A-Z0-9]{10}$/.test(product.asin)) {
        const r = await sendMessage({ type: 'products:put', items: [{ product, snapshot }], source: 'product_page' }).catch(() => null);
        setSynced(r ? r.synced : false);
        const t = await sendMessage({ type: 'track:status', asins: [product.asin] }).catch(() => ({ tracked: [] as string[] }));
        setTracked(t.tracked.includes(product.asin));
      }
    })();
  }, [product, snapshot]);

  const est = computeEstimates(product, snapshot, anchors, { ink });
  const royalty =
    snapshot.priceCents != null && product.pageCount && (product.format === 'paperback' || product.format === 'hardcover')
      ? printRoyalty({ listPriceCents: snapshot.priceCents, pageCount: product.pageCount, binding: product.format, ink })
      : null;
  const webUrl = settings.apiUrl.replace(/\/$/, '');

  const track = async () => {
    setTrackMsg(null);
    const r = await sendMessage({ type: 'track:asin', asin: product.asin, label: product.title?.slice(0, 80) });
    if (r.ok) setTracked(true);
    else setTrackMsg(r.error ?? 'errore');
  };

  return (
    <div className="mb-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 shadow-sm" style={{ fontSize: 13 }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold">RDL Self Publishing</span>
        {product.isIndependent === true && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-800">KDP indipendente</span>}
        {product.isIndependent === false && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">{product.publisher}</span>}
        {product.hasAplus && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">A+</span>}
        <span className="ml-auto text-[11px] text-slate-400">{synced === null ? '' : synced ? 'salvato nella web app' : 'in coda / non collegato'}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6">
        <div>
          <Row k="BSR" v={fmtInt(snapshot.bsr)} hint={snapshot.bsrStore === 'kindle' ? 'Kindle Store' : 'Libri'} />
          <Row k="Vendite/mese" v={fmtSales(est.monthlySales)} hint="stima" />
          <Row k="Ricavo lordo/mese" v={fmtEuro(est.monthlyRevenueCents)} hint="stima" />
          <Row k="Recensioni" v={`${fmtInt(snapshot.reviewsCount)}${snapshot.rating ? ` · ${snapshot.rating}★` : ''}`} />
          <Row k="Rec./giorno" v={est.reviewsPerDay === null ? '—' : est.reviewsPerDay.toFixed(2)} />
          <Row k="Pubblicato" v={product.pubDate ?? '—'} hint={est.ageDays != null ? `${est.ageDays} gg fa` : undefined} />
        </div>
        <div>
          <Row k="Pagine" v={fmtInt(product.pageCount)} />
          <Row k="Prezzo" v={fmtEuro(snapshot.priceCents)} />
          {royalty && (
            <>
              <Row k="Costo stampa" v={fmtEuro(royalty.printCostCents)} hint={ink === 'bw' ? 'B/N' : 'colore premium'} />
              <Row k="Royalty/copia" v={fmtEuro(royalty.royaltyCents)} hint={`${Math.round(royalty.royaltyRate * 100)}%`} />
              <Row k="Royalty/mese" v={fmtEuro(est.monthlyRoyaltyCents)} hint="stima" />
              <label className="flex items-center gap-1 text-[11px] text-slate-500">
                <input type="checkbox" checked={ink === 'premium_color'} onChange={(e) => setInk(e.target.checked ? 'premium_color' : 'bw')} /> interno a colori
              </label>
            </>
          )}
        </div>
      </div>

      {snapshot.categoryRanks.length > 0 && (
        <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
          {snapshot.categoryRanks.map((c) => (
            <div key={`${c.id}-${c.name}`}>
              n. {formatIt(c.rank)} in {c.name}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
        <button
          onClick={track}
          disabled={tracked === true}
          className="rounded border border-slate-400 bg-white px-2 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-60"
        >
          {tracked ? 'Tracciato ✓' : 'Traccia ASIN'}
        </button>
        <a
          href={`${webUrl}/reverse-asin?asin=${product.asin}`}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-slate-400 bg-white px-2 py-0.5 text-xs hover:bg-slate-100"
        >
          Reverse ASIN ↗
        </a>
        <a href={`${webUrl}/prodotti/${product.asin}`} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">
          storico nella web app ↗
        </a>
        {trackMsg && <span className="text-xs text-red-600">{trackMsg}</span>}
      </div>
    </div>
  );
}
