import Link from 'next/link';
import { KeywordResearch } from '@/components/keyword/KeywordResearch';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function KeywordPage() {
  const supabase = await createClient();
  const [{ data: niches }, { data: sessions }] = await Promise.all([
    supabase.from('niches').select('id, name').order('name'),
    supabase.from('research_sessions').select('id, name, seed, alias, created_at, stats').order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <>
      <PageTitle>Ricerca keyword</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Espande una keyword seme con l&apos;autocomplete di amazon.it (prefissi, suffissi, lettere, anni) e raccoglie i suggerimenti reali
        che i lettori digitano. Salva la sessione per ritrovarli, esportali in CSV, aggiungili a una nicchia o al tracking.
      </p>
      <KeywordResearch niches={niches ?? []} />

      <h2 className="mt-10 mb-3 text-lg font-semibold">Sessioni salvate</h2>
      {sessions && sessions.length > 0 ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <Link href={`/keyword/sessioni/${s.id}`} className="font-medium hover:underline">
                {s.name}
              </Link>
              <span className="text-slate-500">
                «{s.seed}» · {s.alias} · {(s.stats as { suggestions?: number } | null)?.suggestions ?? 0} suggerimenti ·{' '}
                {new Date(s.created_at).toLocaleDateString('it-IT')}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Nessuna sessione salvata.</p>
      )}
    </>
  );
}
