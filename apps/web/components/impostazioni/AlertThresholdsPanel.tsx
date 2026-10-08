'use client';

import { DEFAULT_ALERT_THRESHOLDS, resolveAlertThresholds, type AlertThresholds } from '@rdl/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Input, Label } from '@/components/ui';
import type { ProfileSettings } from '@/lib/settings';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { useUser } from '@/lib/use-user';

const FIELDS: { key: keyof AlertThresholds; label: string; pct?: boolean }[] = [
  { key: 'rankDrop', label: 'Posizioni perse (avviso)' },
  { key: 'rankGain', label: 'Posizioni guadagnate (avviso)' },
  { key: 'bsrWorsePct', label: 'BSR peggiorato di almeno (%)', pct: true },
  { key: 'bsrBetterPct', label: 'BSR migliorato di almeno (%)', pct: true },
  { key: 'pricePct', label: 'Variazione prezzo di almeno (%)', pct: true },
  { key: 'reviewsJump', label: 'Nuove recensioni in un giorno' },
];

export function AlertThresholdsPanel({ initialSettings }: { initialSettings: ProfileSettings }) {
  const user = useUser();
  const router = useRouter();
  const [t, setT] = useState<AlertThresholds>(resolveAlertThresholds(initialSettings.alerts));
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!user) return;
    const settings: ProfileSettings = { ...initialSettings, alerts: t };
    const { error } = await createClient()
      .from('profiles')
      .update({ settings: settings as unknown as Json })
      .eq('id', user.id);
    setMsg(error ? `Errore: ${error.message}` : 'Soglie salvate');
    router.refresh();
  }

  return (
    <Card>
      <h2 id="avvisi" className="mb-1 text-base font-semibold">
        Soglie degli avvisi
      </h2>
      <p className="mb-3 text-sm text-slate-600">
        Quando il tracking giornaliero rileva una variazione oltre queste soglie, compare un avviso
        nella pagina Avvisi (e nel popup dell&apos;estensione).
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input
              className="mt-1 w-28"
              type="number"
              min={0}
              step={f.pct ? 1 : 1}
              value={f.pct ? Math.round(t[f.key] * 100) : t[f.key]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v) || v < 0) return;
                setT({ ...t, [f.key]: f.pct ? v / 100 : v });
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="secondary" onClick={save} disabled={!user}>
          Salva soglie
        </Button>
        <Button variant="ghost" onClick={() => setT({ ...DEFAULT_ALERT_THRESHOLDS })}>
          Ripristina default
        </Button>
        {msg && <Alert kind="info">{msg}</Alert>}
      </div>
    </Card>
  );
}
