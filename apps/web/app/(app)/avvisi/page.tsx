import Link from 'next/link';
import { AlertsList, type AlertRow } from '@/components/avvisi/AlertsList';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('alerts')
    .select('id, kind, severity, asin, tracked_keyword_id, keyword, message, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(300);
  const rows: AlertRow[] = (data ?? []).map((a) => ({
    id: a.id,
    kind: a.kind,
    severity: a.severity,
    asin: a.asin,
    trackedKeywordId: a.tracked_keyword_id,
    keyword: a.keyword,
    message: a.message,
    createdAt: a.created_at,
    readAt: a.read_at,
  }));
  return (
    <>
      <PageTitle
        actions={
          <Link href="/impostazioni#avvisi" className="text-sm underline">
            soglie degli avvisi
          </Link>
        }
      >
        Avvisi
      </PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        Generati alla fine di ogni tracking giornaliero confrontando la rilevazione di oggi con
        l&apos;ultima precedente: posizioni perse o guadagnate sulle keyword, BSR peggiorato o
        migliorato, cambi di prezzo, salti di recensioni.
      </p>
      <AlertsList rows={rows} />
    </>
  );
}
