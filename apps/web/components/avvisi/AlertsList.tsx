'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export interface AlertRow {
  id: number;
  kind: string;
  severity: string;
  asin: string | null;
  trackedKeywordId: string | null;
  keyword: string | null;
  message: string;
  createdAt: string;
  readAt: string | null;
}

const KIND_LABEL: Record<string, string> = {
  rank_drop: 'Posizione persa',
  rank_gain: 'Posizione guadagnata',
  rank_lost: 'Uscito dai risultati',
  rank_found: 'Entrato nei risultati',
  bsr_worse: 'BSR peggiorato',
  bsr_better: 'BSR migliorato',
  price_change: 'Prezzo cambiato',
  reviews_jump: 'Recensioni',
};

export function AlertsList({ rows }: { rows: AlertRow[] }) {
  const router = useRouter();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const visible = onlyUnread ? rows.filter((r) => !r.readAt) : rows;
  const unread = rows.filter((r) => !r.readAt).length;

  async function markRead(ids: number[]) {
    if (!ids.length) return;
    await createClient().from('alerts').update({ read_at: new Date().toISOString() }).in('id', ids);
    router.refresh();
  }

  const tone = (s: string) => (s === 'warn' ? 'bad' : s === 'good' ? 'good' : 'neutral');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => setOnlyUnread(e.target.checked)}
          />{' '}
          solo non letti ({unread})
        </label>
        <Button
          variant="secondary"
          className="ml-auto"
          onClick={() => markRead(rows.filter((r) => !r.readAt).map((r) => r.id))}
          disabled={!unread}
        >
          Segna tutti come letti
        </Button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {visible.map((a) => (
          <li
            key={a.id}
            className={`flex items-start gap-3 px-4 py-2 text-sm ${a.readAt ? 'text-slate-500' : ''}`}
          >
            <span className="mt-0.5 shrink-0">
              <Badge tone={tone(a.severity)}>{KIND_LABEL[a.kind] ?? a.kind}</Badge>
            </span>
            <span className="grow">
              <span className={a.readAt ? '' : 'font-medium'}>{a.message}</span>
              <span className="ml-2 text-xs text-slate-400">
                {new Date(a.createdAt).toLocaleString('it-IT')}
                {a.asin && (
                  <>
                    {' · '}
                    <Link href={`/tracking/asin/${a.asin}`} className="underline">
                      storico ASIN
                    </Link>
                  </>
                )}
                {a.trackedKeywordId && (
                  <>
                    {' · '}
                    <Link href={`/tracking/keyword/${a.trackedKeywordId}`} className="underline">
                      tracking keyword
                    </Link>
                  </>
                )}
              </span>
            </span>
            {!a.readAt && (
              <button
                className="shrink-0 text-xs text-slate-400 hover:text-slate-800"
                onClick={() => markRead([a.id])}
              >
                letto
              </button>
            )}
          </li>
        ))}
        {!visible.length && (
          <li className="px-4 py-6 text-center text-sm text-slate-400">Nessun avviso.</li>
        )}
      </ul>
    </div>
  );
}
