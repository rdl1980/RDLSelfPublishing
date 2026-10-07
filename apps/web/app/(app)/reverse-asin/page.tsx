import Link from 'next/link';
import { ReverseAsinForm } from '@/components/reverse-asin/ReverseAsinForm';
import { Badge, PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function ReverseAsinPage({ searchParams }: PageProps<'/reverse-asin'>) {
  const sp = await searchParams;
  const asin = typeof sp.asin === 'string' ? sp.asin.toUpperCase() : '';
  const supabase = await createClient();
  const [{ data: runs }, { data: product }] = await Promise.all([
    supabase.from('reverse_asin_runs').select('id, asin, created_at, candidates, job:jobs(status)').order('created_at', { ascending: false }).limit(30),
    asin ? supabase.from('products').select('asin, title, subtitle').eq('asin', asin).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageTitle>Reverse ASIN</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Dato un libro, scopri per quali keyword compare nelle prime pagine di amazon.it. Le keyword candidate vengono generate dal titolo e dall&apos;autocomplete;
        l&apos;estensione verifica ciascuna cercandola su Amazon (fino a 3 pagine).
      </p>
      <ReverseAsinForm initialAsin={asin} initialTitle={product ? [product.title, product.subtitle].filter(Boolean).join(': ') : ''} />
      <h2 className="mt-8 mb-3 text-lg font-semibold">Analisi salvate</h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {(runs ?? []).map((r) => {
          const status = (r.job as unknown as { status: string } | null)?.status ?? 'pending';
          return (
            <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <Link href={`/reverse-asin/${r.id}`} className="font-mono font-medium hover:underline">
                {r.asin}
              </Link>
              <span className="flex items-center gap-2 text-slate-500">
                {(r.candidates as string[]).length} keyword · <Badge tone={status === 'done' ? 'good' : status === 'failed' ? 'bad' : 'neutral'}>{status}</Badge>
                {new Date(r.created_at).toLocaleString('it-IT')}
              </span>
            </li>
          );
        })}
        {!runs?.length && <li className="px-4 py-4 text-sm text-slate-400">Nessuna analisi ancora.</li>}
      </ul>
    </>
  );
}
