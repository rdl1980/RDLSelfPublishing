'use client';

import { extractCategoryId } from '@rdl/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Input, Label, Select } from '@/components/ui';

export function CategoryScanForm() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [store, setStore] = useState<'books' | 'digital-text'>('books');
  const [kind, setKind] = useState<'bestsellers' | 'new_releases'>('bestsellers');
  const [pages, setPages] = useState(1);
  const [enrich, setEnrich] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onInput(v: string) {
    setInput(v);
    const parsed = extractCategoryId(v);
    if (parsed && v.includes('/')) {
      setStore(parsed.store);
      setKind(parsed.kind);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = extractCategoryId(input);
    if (!parsed)
      return setError(
        'Incolla l’URL della classifica (amazon.it/gp/bestsellers/books/<id>) o l’id numerico della categoria',
      );
    setBusy(true);
    const r = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'category_scan',
        params: { categoryId: parsed.id, store, kind, pages, enrich, maxAsins: pages * 50 },
      }),
    });
    const j = (await r.json()) as { scanId?: string; error?: string };
    setBusy(false);
    if (!r.ok || !j.scanId) return setError(j.error ?? 'Errore');
    router.push(`/categorie/${j.scanId}`);
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="grow">
          <Label>URL della classifica o id categoria</Label>
          <Input
            className="mt-1 w-full"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder="https://www.amazon.it/gp/bestsellers/books/4290113031"
            required
          />
        </div>
        <div>
          <Label>Catalogo</Label>
          <Select
            className="mt-1"
            value={store}
            onChange={(e) => setStore(e.target.value as 'books' | 'digital-text')}
          >
            <option value="books">Libri</option>
            <option value="digital-text">Kindle Store</option>
          </Select>
        </div>
        <div>
          <Label>Classifica</Label>
          <Select
            className="mt-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as 'bestsellers' | 'new_releases')}
          >
            <option value="bestsellers">Best seller</option>
            <option value="new_releases">Nuove uscite</option>
          </Select>
        </div>
        <div>
          <Label>Pagine</Label>
          <Select className="mt-1" value={pages} onChange={(e) => setPages(Number(e.target.value))}>
            <option value={1}>1 (top 50)</option>
            <option value={2}>2 (top 100)</option>
          </Select>
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />{' '}
          scarica i dettagli prodotto (BSR, pagine, editore)
        </label>
        <Button type="submit" disabled={busy || !input.trim()}>
          {busy ? 'Creo il job…' : 'Avvia scansione'}
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
