import Link from 'next/link';
import { CategoryScanForm } from '@/components/categorie/CategoryScanForm';
import { Badge, PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('category_scans')
    .select('id, category_id, category_name, kind, pages, created_at, summary, job:jobs(status)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <PageTitle>Categorie</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Scansiona la classifica Best Seller o Nuove uscite di una categoria di amazon.it (l&apos;id
        lo trovi nell&apos;URL della classifica, es.{' '}
        <span className="font-mono">/gp/bestsellers/books/4290113031</span>): BSR medio, prezzo,
        quota KDP, età dei titoli e punteggio come nel Deep View. Esecuzione tramite
        l&apos;estensione Chrome.
      </p>
      <CategoryScanForm />
      <h2 className="mt-8 mb-3 text-lg font-semibold">Scansioni salvate</h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {(data ?? []).map((s) => {
          const status = (s.job as unknown as { status: string } | null)?.status ?? 'pending';
          const score = (s.summary as { score?: number | null } | null)?.score ?? null;
          return (
            <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <Link href={`/categorie/${s.id}`} className="font-medium hover:underline">
                {s.category_name ?? `categoria ${s.category_id}`}
              </Link>
              <span className="flex items-center gap-2 text-slate-500">
                {score != null && (
                  <Badge tone={score >= 70 ? 'good' : score >= 45 ? 'warn' : 'bad'}>
                    nicchia {score}
                  </Badge>
                )}
                <Badge tone={status === 'done' ? 'good' : status === 'failed' ? 'bad' : 'neutral'}>
                  {status}
                </Badge>
                {s.kind === 'new_releases' ? 'nuove uscite' : 'best seller'} · {s.pages} pag. ·{' '}
                {new Date(s.created_at).toLocaleString('it-IT')}
              </span>
            </li>
          );
        })}
        {!data?.length && (
          <li className="px-4 py-4 text-sm text-slate-400">Nessuna scansione ancora.</li>
        )}
      </ul>
    </>
  );
}
