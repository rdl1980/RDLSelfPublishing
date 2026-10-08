'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Select } from '@/components/ui';

/** Lancia il Reverse ASIN in massa sui primi N risultati organici del Deep View. */
export function BulkReverseButton({
  deepViewId,
  disabled,
}: {
  deepViewId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [topN, setTopN] = useState(10);
  const [pages, setPages] = useState(2);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/deep-view/${deepViewId}/reverse-bulk`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topN, pages }),
    });
    const j = (await r.json()) as {
      error?: string;
      keywords?: number;
      asins?: number;
      fetches?: number;
    };
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? 'Errore');
    setMsg(
      `Job creato: ${j.keywords} keyword × ${pages} pagine per ${j.asins} libri (circa ${j.fetches} ricerche).`,
    );
    router.push(`/deep-view/${deepViewId}/keyword`);
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-500">Keyword dei concorrenti: primi</span>
      <Select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
        {[5, 10, 15, 20].map((n) => (
          <option key={n} value={n}>
            {n} libri
          </option>
        ))}
      </Select>
      <Select value={pages} onChange={(e) => setPages(Number(e.target.value))}>
        {[1, 2, 3].map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? 'pagina' : 'pagine'}
          </option>
        ))}
      </Select>
      <Button variant="secondary" onClick={run} disabled={busy || disabled}>
        {busy ? 'Creo il job…' : 'Avvia Reverse ASIN in massa'}
      </Button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </span>
  );
}
