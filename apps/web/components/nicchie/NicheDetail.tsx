'use client';

import { buildSearchUrl, extractAsin, productUrl, toCsv } from '@rdl/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { downloadText, safeFilename } from '@/lib/download';
import { addAsinToNiche, addKeywordToNiche } from '@/lib/keywords';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';

interface Item {
  id: string;
  kind: 'keyword' | 'asin';
  asin: string | null;
  note: string | null;
  keyword: string | null;
}
interface ProductLite {
  asin: string;
  title: string | null;
  is_independent: boolean | null;
  page_count: number | null;
  pub_date: string | null;
  image_url: string | null;
}

export function NicheDetail({ niche, items, products }: { niche: { id: string; name: string; notes: string | null }; items: Item[]; products: ProductLite[] }) {
  const user = useUser();
  const router = useRouter();
  const [notes, setNotes] = useState(niche.notes ?? '');
  const [newKw, setNewKw] = useState('');
  const [newAsin, setNewAsin] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const byAsin = new Map(products.map((p) => [p.asin, p]));

  async function saveNotes() {
    const { error } = await createClient().from('niches').update({ notes, updated_at: new Date().toISOString() }).eq('id', niche.id);
    setMsg(error ? error.message : 'Note salvate');
  }
  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newKw.trim()) return;
    try {
      await addKeywordToNiche(createClient(), user.id, niche.id, newKw);
      setNewKw('');
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }
  async function addAsin(e: React.FormEvent) {
    e.preventDefault();
    const asin = extractAsin(newAsin);
    if (!user || !asin) return setMsg('ASIN o URL non valido');
    try {
      await addAsinToNiche(createClient(), user.id, niche.id, asin);
      setNewAsin('');
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }
  async function remove(id: string) {
    await createClient().from('niche_items').delete().eq('id', id);
    router.refresh();
  }
  function exportCsv() {
    const csv = toCsv(items, [
      { key: 'kind', label: 'Tipo' },
      { key: 'v', label: 'Valore', format: (i) => i.keyword ?? i.asin ?? '' },
      { key: 't', label: 'Titolo', format: (i) => (i.asin ? byAsin.get(i.asin)?.title ?? '' : '') },
      { key: 'note', label: 'Note' },
      { key: 'url', label: 'URL', format: (i) => (i.keyword ? buildSearchUrl(i.keyword) : i.asin ? productUrl(i.asin) : '') },
    ]);
    downloadText(`nicchia_${safeFilename(niche.name)}.csv`, csv);
  }

  const keywords = items.filter((i) => i.kind === 'keyword');
  const asins = items.filter((i) => i.kind === 'asin');

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-2 text-sm font-semibold">Note</h3>
        <textarea className="w-full rounded border border-slate-300 p-2 text-sm" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" onClick={saveNotes}>
            Salva note
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!items.length}>
            Esporta CSV
          </Button>
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-sm font-semibold">Keyword ({keywords.length})</h3>
          <form onSubmit={addKeyword} className="mb-3 flex gap-2">
            <Input className="grow" placeholder="Aggiungi keyword" value={newKw} onChange={(e) => setNewKw(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!user}>
              Aggiungi
            </Button>
          </form>
          <ul className="divide-y divide-slate-100 text-sm">
            {keywords.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-1.5">
                <a href={buildSearchUrl(i.keyword ?? '')} target="_blank" rel="noreferrer" className="hover:underline">
                  {i.keyword}
                </a>
                <button className="text-xs text-slate-400 hover:text-red-600" onClick={() => remove(i.id)}>
                  rimuovi
                </button>
              </li>
            ))}
            {!keywords.length && <li className="py-2 text-slate-400">Nessuna keyword</li>}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-semibold">ASIN ({asins.length})</h3>
          <form onSubmit={addAsin} className="mb-3 flex gap-2">
            <Input className="grow" placeholder="ASIN o URL amazon.it" value={newAsin} onChange={(e) => setNewAsin(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!user}>
              Aggiungi
            </Button>
          </form>
          <ul className="divide-y divide-slate-100 text-sm">
            {asins.map((i) => {
              const p = i.asin ? byAsin.get(i.asin) : undefined;
              return (
                <li key={i.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <Link href={`/prodotti/${i.asin}`} className="font-mono text-xs hover:underline">
                      {i.asin}
                    </Link>
                    {p?.title && <div className="truncate text-slate-700">{p.title}</div>}
                    <div className="flex gap-1">
                      {p?.is_independent && <Badge tone="good">KDP</Badge>}
                      {p?.page_count && <Badge>{p.page_count} pp</Badge>}
                    </div>
                  </div>
                  <button className="shrink-0 text-xs text-slate-400 hover:text-red-600" onClick={() => remove(i.id)}>
                    rimuovi
                  </button>
                </li>
              );
            })}
            {!asins.length && <li className="py-2 text-slate-400">Nessun ASIN</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
