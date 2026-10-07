'use client';

import { candidatePhrasesFromTitle, extractAsin, normalizeKeyword, runSuggestionQueries } from '@rdl/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { proxyFetch } from '@/components/keyword/proxy-fetch';
import { Alert, Button, Card, Input, Label } from '@/components/ui';

export function ReverseAsinForm({ initialAsin = '', initialTitle = '' }: { initialAsin?: string; initialTitle?: string }) {
  const router = useRouter();
  const [asinInput, setAsinInput] = useState(initialAsin);
  const [title, setTitle] = useState(initialTitle);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    if (!title.trim()) return setError('Inserisci il titolo (e sottotitolo) del libro');
    setBusy('Genero le keyword candidate…');
    const fromTitle = candidatePhrasesFromTitle(title, null, { maxPhrases: 25 });
    const seeds = fromTitle.slice(0, 6);
    const { suggestions } = await runSuggestionQueries(proxyFetch, seeds, { concurrency: 3, minGapMs: 50 });
    const all = Array.from(new Set([...fromTitle, ...suggestions.slice(0, 30).map((s) => s.normalized)])).slice(0, 50);
    setCandidates(all);
    setSelected(new Set(all.slice(0, 30)));
    setBusy(null);
  }

  function addExtra() {
    const kws = extra
      .split(/[\n,;]+/)
      .map((k) => normalizeKeyword(k))
      .filter(Boolean);
    if (!kws.length) return;
    setCandidates((c) => Array.from(new Set([...kws, ...c])));
    setSelected((s) => new Set([...s, ...kws]));
    setExtra('');
  }

  async function submit() {
    const asin = extractAsin(asinInput);
    if (!asin) return setError('ASIN o URL non valido');
    const list = candidates.filter((c) => selected.has(c)).slice(0, 40);
    if (!list.length) return setError('Seleziona almeno una keyword');
    setBusy('Creo il job…');
    const r = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'reverse_asin', params: { asin, candidates: list, alias: 'stripbooks', pages: 3 } }),
    });
    const j = (await r.json()) as { runId?: string; error?: string };
    setBusy(null);
    if (!r.ok || !j.runId) return setError(j.error ?? 'Errore');
    router.push(`/reverse-asin/${j.runId}`);
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>ASIN o URL amazon.it</Label>
          <Input className="mt-1 w-64" value={asinInput} onChange={(e) => setAsinInput(e.target.value)} placeholder="B0CKHTRYS5" />
        </div>
        <div className="grow">
          <Label>Titolo e sottotitolo del libro</Label>
          <Input className="mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Copia il titolo completo dalla pagina Amazon" />
        </div>
        <Button variant="secondary" onClick={generate} disabled={!!busy}>
          Genera candidate
        </Button>
      </div>
      {busy && <Alert kind="info">{busy}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {candidates.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <label key={c} className={`cursor-pointer rounded border px-2 py-1 text-sm ${selected.has(c) ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white'}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selected.has(c)}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (n.has(c)) n.delete(c);
                      else n.add(c);
                      return n;
                    })
                  }
                />
                {c}
              </label>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="grow">
              <Label>Altre keyword (una per riga o separate da virgola)</Label>
              <textarea className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={addExtra}>
              Aggiungi
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={!!busy || !selected.size}>
              Avvia verifica ({Math.min(40, selected.size)} keyword, max 40)
            </Button>
            <span className="text-xs text-slate-500">Ogni keyword costa fino a 3 pagine di ricerca su Amazon: 40 keyword ≈ 60-120 richieste.</span>
          </div>
        </>
      )}
    </Card>
  );
}
