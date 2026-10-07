import { TrackedKeywordsList } from '@/components/tracking/TrackedKeywordsList';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function TrackingKeywordPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tracked_keywords')
    .select('id, alias, pages, watch_asins, active, last_run_at, created_at, keyword:keywords(text)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    keyword: (r.keyword as unknown as { text: string } | null)?.text ?? '',
    alias: r.alias,
    pages: r.pages,
    watchAsins: r.watch_asins,
    active: r.active,
    lastRunAt: r.last_run_at,
  }));
  return (
    <>
      <PageTitle>Tracking keyword</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Le keyword tracciate vengono cercate ogni giorno dall&apos;estensione (Fase 5) per registrare la posizione degli ASIN osservati.
      </p>
      <TrackedKeywordsList rows={rows} />
    </>
  );
}
