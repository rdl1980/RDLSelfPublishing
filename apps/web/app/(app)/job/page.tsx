import { JobsTable } from '@/components/jobs/JobsTable';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function JobsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('jobs')
    .select('id, type, status, params, progress, error, attempts, max_attempts, created_at, started_at, finished_at, heartbeat_at, claimed_by')
    .order('created_at', { ascending: false })
    .limit(100);
  return (
    <>
      <PageTitle>Job</PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Lavori in coda per l&apos;estensione Chrome (Deep View, Reverse ASIN, tracking). L&apos;estensione li preleva ogni minuto quando Chrome è aperto;
        dal popup puoi forzare «Esegui ora».
      </p>
      <JobsTable jobs={data ?? []} />
    </>
  );
}
