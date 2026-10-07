'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Input, Label, Select } from '@/components/ui';

export function DeepViewForm({ initialKeyword = '' }: { initialKeyword?: string }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [alias, setAlias] = useState('stripbooks');
  const [pages, setPages] = useState(2);
  const [enrich, setEnrich] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'deep_view', params: { keyword: keyword.trim(), alias, pages, enrich, maxAsins: pages * 50 } }),
    });
    const j = (await r.json()) as { deepViewId?: string; error?: string };
    setBusy(false);
    if (!r.ok || !j.deepViewId) return setError(j.error ?? 'Errore');
    router.push(`/deep-view/${j.deepViewId}`);
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="grow">
          <Label>Keyword</Label>
          <Input className="mt-1 w-full" value={keyword} onChange={(e) => setKeyword(e.target.value)} required placeholder="es. agenda 2027 settimanale" />
        </div>
        <div>
          <Label>Catalogo</Label>
          <Select className="mt-1" value={alias} onChange={(e) => setAlias(e.target.value)}>
            <option value="stripbooks">Libri</option>
            <option value="digital-text">Kindle Store</option>
          </Select>
        </div>
        <div>
          <Label>Pagine</Label>
          <Select className="mt-1" value={pages} onChange={(e) => setPages(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} (~{n * 48} risultati)
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} /> scarica i dettagli prodotto (BSR, pagine, editore)
        </label>
        <Button type="submit" disabled={busy || !keyword.trim()}>
          {busy ? 'Creo il job…' : 'Avvia Deep View'}
        </Button>
      </form>
      {error && (
        <div className="mt-3">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
    </Card>
  );
}
