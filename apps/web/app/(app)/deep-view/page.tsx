import Link from 'next/link';
import { DeepViewForm } from '@/components/deep-view/DeepViewForm';
import { Badge, PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function DeepViewPage({ searchParams }: PageProps<'/deep-view'>) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from('deep_views')
    .select('id, alias, pages, created_at, summary, keyword:keywords(text), job:jobs(status)')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <>
      <PageTitle>Deep View</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Analizza i primi 50-100 risultati di una keyword su amazon.it: BSR, vendite stimate, pagine, editore, età e punteggio di nicchia. Il lavoro viene eseguito
        dall&apos;estensione Chrome nel tuo browser.
      </p>
      <DeepViewForm initialKeyword={typeof sp.keyword === 'string' ? sp.keyword : ''} />
      <h2 className="mt-8 mb-3 text-lg font-semibold">Analisi salvate</h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {(data ?? []).map((d) => {
          const kw = (d.keyword as unknown as { text: string } | null)?.text ?? '';
          const status = (d.job as unknown as { status: string } | null)?.status ?? 'pending';
          const score = (d.summary as { score?: number | null } | null)?.score ?? null;
          return (
            <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <Link href={`/deep-view/${d.id}`} className="font-medium hover:underline">
                {kw}
              </Link>
              <span className="flex items-center gap-2 text-slate-500">
                {score != null && <Badge tone={score >= 70 ? 'good' : score >= 45 ? 'warn' : 'bad'}>nicchia {score}</Badge>}
                <Badge tone={status === 'done' ? 'good' : status === 'failed' ? 'bad' : 'neutral'}>{status}</Badge>
                {d.pages} pagine · {new Date(d.created_at).toLocaleString('it-IT')}
              </span>
            </li>
          );
        })}
        {!data?.length && <li className="px-4 py-4 text-sm text-slate-400">Nessuna analisi ancora.</li>}
      </ul>
    </>
  );
}
