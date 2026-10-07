'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';

export function RunTrackingButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <span className="flex items-center gap-2">
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await fetch('/api/tracking/materialize', { method: 'POST' });
          const j = (await r.json()) as { keywordJobs?: number; asinJobs?: number; error?: string };
          setBusy(false);
          setMsg(r.ok ? `Creati ${j.keywordJobs} job keyword e ${j.asinJobs} job ASIN per oggi: l’estensione li eseguirà a breve.` : (j.error ?? 'Errore'));
          router.refresh();
        }}
      >
        Esegui il tracking oggi
      </Button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </span>
  );
}
