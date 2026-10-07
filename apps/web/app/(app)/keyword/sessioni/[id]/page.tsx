import { notFound } from 'next/navigation';
import type { SearchAlias } from '@rdl/core';
import { SuggestionsTable } from '@/components/keyword/SuggestionsTable';
import { DeleteSessionButton } from '@/components/keyword/DeleteSessionButton';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function SessionPage({ params }: PageProps<'/keyword/sessioni/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: session }, { data: rows }, { data: niches }] = await Promise.all([
    supabase.from('research_sessions').select('*').eq('id', id).maybeSingle(),
    supabase.from('keyword_suggestions').select('suggestion, normalized, source_query, position').eq('session_id', id).order('position'),
    supabase.from('niches').select('id, name').order('name'),
  ]);
  if (!session) notFound();

  return (
    <>
      <PageTitle actions={<DeleteSessionButton id={session.id} />}>{session.name}</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Seme «{session.seed}» · catalogo {session.alias} · {new Date(session.created_at).toLocaleString('it-IT')} · {rows?.length ?? 0} suggerimenti
      </p>
      <SuggestionsTable
        rows={(rows ?? []).map((r) => ({ value: r.suggestion, normalized: r.normalized, sourceQuery: r.source_query, position: r.position ?? 0 }))}
        alias={session.alias as SearchAlias}
        niches={niches ?? []}
        exportName={`sessione_${session.seed}`}
      />
    </>
  );
}
