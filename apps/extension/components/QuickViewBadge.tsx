import type { BsrAnchor, BsrStore, SearchResultItem } from '@rdl/core';
import type { CachedProduct } from '@/lib/cache';
import { computeEstimates, fmtEuro, fmtInt, fmtSales } from '@/lib/estimates';

export type BadgeState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: CachedProduct };

export function QuickViewBadge({ item, state, anchors }: { item: SearchResultItem; state: BadgeState; anchors: Record<BsrStore, BsrAnchor[]> }) {
  if (state.status === 'loading') return <div className="rdl loading">RDL: carico i dati del prodotto…</div>;
  if (state.status === 'error') return <div className="rdl error">RDL: {state.message}</div>;

  const { product, snapshot } = state.data;
  const est = computeEstimates(product, snapshot, anchors);
  const isNew = est.ageDays != null && est.ageDays <= 180;

  return (
    <div className="rdl">
      <span>
        <span className="k">BSR </span>
        <span className="v">{fmtInt(snapshot.bsr)}</span>
      </span>
      <span className="sales">
        <span className="k">vendite/mese </span>
        <span className="v">{fmtSales(est.monthlySales)}</span>
      </span>
      <span>
        <span className="k">ricavo/mese </span>
        <span className="v">{fmtEuro(est.monthlyRevenueCents)}</span>
      </span>
      {est.royaltyCents !== null && (
        <span>
          <span className="k">royalty/copia </span>
          <span className="v">{fmtEuro(est.royaltyCents)}</span>
        </span>
      )}
      <span>
        <span className="k">pagine </span>
        <span className="v">{fmtInt(product.pageCount)}</span>
      </span>
      <span>
        <span className="k">pubbl. </span>
        <span className="v">{product.pubDate ?? item.pubDate ?? '—'}</span>
        {est.ageDays != null && <span className="k"> ({est.ageDays} gg)</span>}
      </span>
      {est.reviewsPerDay !== null && (
        <span>
          <span className="k">rec./giorno </span>
          <span className="v">{est.reviewsPerDay.toFixed(2)}</span>
        </span>
      )}
      {product.isIndependent === true && <span className="tag kdp">KDP</span>}
      {product.isIndependent === false && product.publisher && <span className="tag pub">{product.publisher.slice(0, 24)}</span>}
      {product.hasAplus && <span className="tag aplus">A+</span>}
      {isNew && <span className="tag new">nuovo</span>}
    </div>
  );
}
