import Link from 'next/link';
import { RunTrackingButton } from '@/components/tracking/RunTrackingButton';
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
      <PageTitle actions={<RunTrackingButton />}>Tracking keyword</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Le keyword tracciate vengono cercate ogni giorno dall&apos;estensione per registrare la posizione degli ASIN osservati. <Link href="/tracking/asin" className="underline">Tracking ASIN →</Link>
      </p>
      <TrackedKeywordsList rows={rows} />
    </>
  );
}
