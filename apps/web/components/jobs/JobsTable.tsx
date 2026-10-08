'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Badge, Button } from '@/components/ui';

interface JobLite {
  id: string;
  type: string;
  status: string;
  params: unknown;
  progress: unknown;
  error: string | null;
  attempts: number;
  max_attempts: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  heartbeat_at: string | null;
  claimed_by: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  deep_view: 'Deep View',
  reverse_asin: 'Reverse ASIN',
  enrich_asins: 'Arricchimento ASIN',
  track_keyword: 'Tracking keyword',
  track_asins: 'Tracking ASIN',
  category_scan: 'Scansione categoria',
  ai_reserved: 'AI',
};

function describe(j: JobLite): string {
  const p = (j.params ?? {}) as Record<string, unknown>;
  if (j.type === 'deep_view') return `«${p.keyword}» · ${p.pages} pagine`;
  if (j.type === 'reverse_asin') return `${p.asin} · ${(p.candidates as string[] | undefined)?.length ?? 0} keyword`;
  if (j.type === 'track_keyword') return `«${p.keyword}»`;
  if (j.type === 'track_asins') return `${(p.asins as string[] | undefined)?.length ?? 0} ASIN`;
  if (j.type === 'category_scan') return `categoria ${p.categoryId} · ${p.kind === 'new_releases' ? 'nuove uscite' : 'best seller'} · ${p.pages} pag.`;
  return '';
}

export function JobsTable({ jobs }: { jobs: JobLite[] }) {
  const router = useRouter();
  const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'running');

  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [hasActive, router]);

  async function act(id: string, action: 'cancel' | 'retry') {
    await fetch(`/api/jobs/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    router.refresh();
  }

  const tone = (s: string) => (s === 'done' ? 'good' : s === 'failed' ? 'bad' : s === 'running' ? 'warn' : 'neutral');

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Dettaglio</th>
            <th className="px-3 py-2 text-left">Stato</th>
            <th className="px-3 py-2 text-left">Avanzamento</th>
            <th className="px-3 py-2 text-left">Creato</th>
            <th className="px-3 py-2 text-left">Ultimo segnale</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((j) => {
            const p = (j.progress ?? {}) as { done?: number; total?: number; step?: string; message?: string };
            return (
              <tr key={j.id}>
                <td className="px-3 py-1.5">{TYPE_LABEL[j.type] ?? j.type}</td>
                <td className="px-3 py-1.5 text-slate-600">{describe(j)}</td>
                <td className="px-3 py-1.5">
                  <Badge tone={tone(j.status)}>{j.status}</Badge>
                  {j.attempts > 1 && <span className="ml-1 text-xs text-slate-400">tent. {j.attempts}/{j.max_attempts}</span>}
                  {j.error && <div className="max-w-xs truncate text-xs text-red-600" title={j.error}>{j.error}</div>}
                </td>
                <td className="px-3 py-1.5 text-slate-600">
                  {p.step ?? ''} {p.done ?? 0}/{p.total ?? 0} <span className="text-xs text-slate-400">{p.message ?? ''}</span>
                </td>
                <td className="px-3 py-1.5 text-slate-500">{new Date(j.created_at).toLocaleString('it-IT')}</td>
                <td className="px-3 py-1.5 text-slate-500">{j.heartbeat_at ? new Date(j.heartbeat_at).toLocaleTimeString('it-IT') : '—'}</td>
                <td className="px-3 py-1.5 text-right">
                  {(j.status === 'pending' || j.status === 'running') && (
                    <Button variant="ghost" onClick={() => act(j.id, 'cancel')}>
                      Annulla
                    </Button>
                  )}
                  {(j.status === 'failed' || j.status === 'cancelled') && (
                    <Button variant="ghost" onClick={() => act(j.id, 'retry')}>
                      Riprova
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
          {!jobs.length && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                Nessun job
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
