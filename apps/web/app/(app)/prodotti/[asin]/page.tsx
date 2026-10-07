import { estimateMonthlySales, formatEuroCents, formatIt, productUrl, roundEstimate } from '@rdl/core';
import { notFound } from 'next/navigation';
import { Badge, Card, PageTitle, Stat } from '@/components/ui';
import { anchorsFromSettings, parseProfileSettings } from '@/lib/settings';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function ProductPage({ params }: PageProps<'/prodotti/[asin]'>) {
  const { asin } = await params;
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: product }, { data: snapshots }, { data: profile }] = await Promise.all([
    supabase.from('products').select('*').eq('asin', asin).maybeSingle(),
    supabase.from('product_snapshots').select('*').eq('asin', asin).order('captured_at', { ascending: false }).limit(30),
    supabase.from('profiles').select('settings').eq('id', user!.id).maybeSingle(),
  ]);
  if (!product) notFound();
  const last = snapshots?.[0] ?? null;
  const anchors = anchorsFromSettings(parseProfileSettings(profile?.settings));
  const monthly = last ? estimateMonthlySales(last.bsr, (last.bsr_store as 'books' | 'kindle' | null) ?? 'books', anchors) : null;

  return (
    <>
      <PageTitle actions={<a href={productUrl(asin)} target="_blank" rel="noreferrer" className="text-sm underline">Apri su amazon.it ↗</a>}>
        {product.title ?? asin}
      </PageTitle>
      <div className="flex gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {product.image_url && <img src={product.image_url} alt="" className="h-48 w-32 rounded object-cover" />}
        <div className="grow space-y-3">
          <div className="flex flex-wrap gap-1 text-sm text-slate-600">
            <span className="font-mono">{asin}</span>
            {product.authors.length > 0 && <span>· {product.authors.join(', ')}</span>}
            {product.is_independent === true && <Badge tone="good">KDP indipendente</Badge>}
            {product.is_independent === false && <Badge>{product.publisher}</Badge>}
            {product.has_aplus && <Badge tone="warn">A+</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="BSR" value={last?.bsr ? formatIt(last.bsr) : '—'} hint={last?.bsr_store ?? undefined} />
            <Stat label="Vendite/mese (stima)" value={monthly === null ? '—' : formatIt(roundEstimate(monthly) ?? 0)} />
            <Stat label="Prezzo" value={last?.price_cents != null ? formatEuroCents(last.price_cents) : '—'} />
            <Stat label="Recensioni" value={last?.reviews_count != null ? `${formatIt(last.reviews_count)} · ${last.rating ?? '—'}★` : '—'} />
            <Stat label="Pagine" value={product.page_count ?? '—'} />
            <Stat label="Pubblicato" value={product.pub_date ?? '—'} />
            <Stat label="Lingua" value={product.language ?? '—'} />
            <Stat label="Formato" value={product.format ?? '—'} />
          </div>
          {last && (last.category_ranks as { id: string | null; name: string; rank: number }[]).length > 0 && (
            <Card>
              <h3 className="mb-1 text-sm font-semibold">Categorie</h3>
              <ul className="text-sm">
                {(last.category_ranks as { id: string | null; name: string; rank: number }[]).map((c) => (
                  <li key={`${c.id}-${c.name}`}>
                    n. {formatIt(c.rank)} in {c.name}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <h3 className="mb-1 text-sm font-semibold">Storico ({snapshots?.length ?? 0} rilevazioni)</h3>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 text-left">Data</th>
                  <th className="py-1 text-left">Fonte</th>
                  <th className="py-1 text-right">BSR</th>
                  <th className="py-1 text-right">Prezzo</th>
                  <th className="py-1 text-right">Recensioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(snapshots ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="py-1">{new Date(s.captured_at).toLocaleString('it-IT')}</td>
                    <td className="py-1 text-slate-500">{s.source}</td>
                    <td className="py-1 text-right">{s.bsr ? formatIt(s.bsr) : '—'}</td>
                    <td className="py-1 text-right">{s.price_cents != null ? formatEuroCents(s.price_cents) : '—'}</td>
                    <td className="py-1 text-right">{s.reviews_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
