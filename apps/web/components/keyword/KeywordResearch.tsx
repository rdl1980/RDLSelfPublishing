'use client';

import { buildExpansionQueries, EXPANSION_IT, runSuggestionQueries, type KeywordSuggestion, type SearchAlias } from '@rdl/core';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';
import { Alert, Button, Card, Input, Label, Select } from '@/components/ui';
import { proxyFetch } from './proxy-fetch';
import { SuggestionsTable, type NicheOption } from './SuggestionsTable';

export function KeywordResearch({ niches }: { niches: NicheOption[] }) {
  const user = useUser();
  const router = useRouter();
  const [seed, setSeed] = useState('');
  const [alias, setAlias] = useState<SearchAlias>('stripbooks');
  const [opts, setOpts] = useState({ prefixes: true, suffixes: true, years: true, letters: true });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; found: number } | null>(null);
  const [results, setResults] = useState<KeywordSuggestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const queries = buildExpansionQueries(seed, EXPANSION_IT, opts);
    if (!queries.length) return;
    setRunning(true);
    setResults([]);
    setErrors([]);
    setSaveMsg(null);
    setProgress({ done: 0, total: queries.length, found: 0 });
    abort.current = new AbortController();
    try {
      const { suggestions, errors } = await runSuggestionQueries(proxyFetch, queries, {
        alias,
        concurrency: EXPANSION_IT.concurrency,
        minGapMs: 60,
        signal: abort.current.signal,
        onProgress: setProgress,
      });
      setResults(suggestions);
      setErrors(errors.map((x) => `${x.query}: ${x.error}`));
      if (!sessionName) setSessionName(`${seed.trim()} — ${new Date().toLocaleDateString('it-IT')}`);
    } finally {
      setRunning(false);
    }
  }

  async function saveSession() {
    if (!user || !results.length) return;
    setSaveMsg(null);
    const supabase = createClient();
    const { data: session, error } = await supabase
      .from('research_sessions')
      .insert({
        user_id: user.id,
        name: sessionName.trim() || seed,
        seed: seed.trim(),
        alias,
        options: opts,
        stats: { queries: progress?.total ?? 0, suggestions: results.length, errors: errors.length },
      })
      .select('id')
      .single();
    if (error || !session) {
      setSaveMsg(`Errore: ${error?.message ?? 'sconosciuto'}`);
      return;
    }
    const rows = results.map((r) => ({
      user_id: user.id,
      session_id: session.id,
      suggestion: r.value,
      normalized: r.normalized,
      source_query: r.sourceQuery,
      position: r.position,
      alias,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: e2 } = await supabase.from('keyword_suggestions').insert(rows.slice(i, i + 500));
      if (e2) {
        setSaveMsg(`Errore nel salvataggio: ${e2.message}`);
        return;
      }
    }
    setSaveMsg('Sessione salvata');
    router.push(`/keyword/sessioni/${session.id}`);
  }

  const checkbox = (key: keyof typeof opts, label: string) => (
    <label className="flex items-center gap-1 text-sm">
      <input type="checkbox" checked={opts[key]} onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={run} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grow">
              <Label>Keyword seme</Label>
              <Input className="mt-1 w-full" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="es. agenda 2027, quaderno ricette, sudoku per adulti" required />
            </div>
            <div>
              <Label>Catalogo</Label>
              <Select className="mt-1" value={alias} onChange={(e) => setAlias(e.target.value as SearchAlias)}>
                <option value="stripbooks">Libri</option>
                <option value="digital-text">Kindle Store</option>
                <option value="aps">Tutte le categorie</option>
              </Select>
            </div>
            <Button type="submit" disabled={running || !seed.trim()}>
              {running ? 'Ricerca in corso…' : 'Cerca suggerimenti'}
            </Button>
            {running && (
              <Button type="button" variant="secondary" onClick={() => abort.current?.abort()}>
                Interrompi
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {checkbox('prefixes', 'Prefissi (libro, quaderno, agenda…)')}
            {checkbox('suffixes', 'Suffissi (per bambini, per adulti…)')}
            {checkbox('years', 'Anni')}
            {checkbox('letters', 'Lettere a-z')}
          </div>
          {progress && (
            <div className="text-sm text-slate-600">
              Query {progress.done}/{progress.total} · suggerimenti unici: {progress.found}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-200">
                <div className="h-full bg-slate-800 transition-all" style={{ width: `${(100 * progress.done) / Math.max(1, progress.total)}%` }} />
              </div>
            </div>
          )}
        </form>
      </Card>

      {errors.length > 0 && <Alert kind="warn">{errors.length} query fallite (es. {errors[0]})</Alert>}

      {results.length > 0 && (
        <>
          <Card className="flex flex-wrap items-center gap-2">
            <Label>Nome sessione</Label>
            <Input className="w-80" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
            <Button onClick={saveSession} disabled={!user}>
              Salva sessione
            </Button>
            {saveMsg && <span className="text-sm text-slate-600">{saveMsg}</span>}
          </Card>
          <SuggestionsTable rows={results} alias={alias} niches={niches} exportName={`keyword_${seed}`} />
        </>
      )}
    </div>
  );
}
