'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui';

interface JobInfo {
  status: string;
  progress: { done?: number; total?: number; step?: string; message?: string };
  error: string | null;
  heartbeat_at: string | null;
}

/** Fa polling su un job e ricarica la pagina quando avanza o finisce. */
export function JobWatcher({ jobId, initialStatus }: { jobId: string; initialStatus: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<JobInfo | null>(null);
  const [stale, setStale] = useState(false);
  const active = initialStatus === 'pending' || initialStatus === 'running';

  useEffect(() => {
    if (!active) return;
    let last = '';
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as JobInfo;
        setInfo(j);
        setStale(j.heartbeat_at ? Date.now() - new Date(j.heartbeat_at).getTime() > 3 * 60 * 1000 : false);
        const key = `${j.status}|${j.progress?.done}|${j.progress?.step}`;
        if (key !== last) {
          last = key;
          router.refresh();
        }
        if (j.status !== 'pending' && j.status !== 'running') stop = true;
      } catch {
        /* riprova al prossimo giro */
      }
    };
    void tick();
    const id = setInterval(() => {
      if (stop) clearInterval(id);
      else void tick();
    }, 3000);
    return () => clearInterval(id);
  }, [jobId, active, router]);

  if (!active && initialStatus !== 'failed') return null;
  const p = info?.progress ?? {};
  if (initialStatus === 'failed' || info?.status === 'failed') return <Alert kind="error">Job fallito: {info?.error ?? 'errore sconosciuto'}</Alert>;
  return (
    <Alert kind="info">
      {info?.status === 'running' ? 'In esecuzione' : 'In attesa dell’estensione'} · {p.step ?? ''} {p.done ?? 0}/{p.total ?? 0} {p.message ?? ''}
      {info?.status === 'pending' && (
        <span className="ml-2 text-xs text-slate-500">
          L’estensione Chrome raccoglie i job ogni minuto (o subito con «Esegui ora» dal popup). Chrome deve essere aperto.
        </span>
      )}
      {stale && <span className="ml-2 text-xs text-amber-700">Nessun segnale dall’estensione da oltre 3 minuti.</span>}
    </Alert>
  );
}
