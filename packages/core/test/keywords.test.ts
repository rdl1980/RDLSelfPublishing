import { describe, expect, it } from 'vitest';
import { toCsv } from '../src/csv';
import { autocompleteUrl, fetchSuggestions, runSuggestionQueries } from '../src/keywords/autocomplete';
import { buildExpansionQueries } from '../src/keywords/expansion';
import { candidatePhrasesFromTitle } from '../src/keywords/ngrams';
import { normalizeKeyword } from '../src/keywords/normalize';
import { JobSchema, parseJobParams, ProgressPayloadSchema } from '../src/jobs/protocol';
import { emptyDeepViewState, nextDeepViewStep } from '../src/jobs/planners';
import { buildSearchUrl, extractAsin, parseSearchUrl } from '../src/urls';
import { loadJsonFixture } from './helpers/load-fixture';

describe('normalizeKeyword', () => {
  it('minuscolo, accenti mantenuti, spazi collassati', () => {
    expect(normalizeKeyword('  Libro  Ricette: PERÒ! ')).toBe('libro ricette però');
    expect(normalizeKeyword("L'agenda 2027")).toBe('lagenda 2027');
  });
});

describe('buildExpansionQueries', () => {
  it('include seme, prefissi, suffissi, anni e lettere senza duplicati', () => {
    const q = buildExpansionQueries('agenda 2027');
    expect(q[0]).toBe('agenda 2027');
    expect(q).toContain('libro agenda 2027');
    expect(q).toContain('agenda 2027 per bambini');
    expect(q).toContain('agenda 2027 a');
    expect(q).toContain('agenda 2027 z');
    expect(new Set(q).size).toBe(q.length);
    // "agenda" è già un prefisso: non deve produrre "agenda agenda 2027"
    expect(q).not.toContain('agenda agenda 2027');
  });
  it('rispetta maxQueries e le opzioni', () => {
    expect(buildExpansionQueries('sudoku', undefined, { letters: false, prefixes: false, suffixes: false, years: false })).toEqual(['sudoku']);
    expect(buildExpansionQueries('sudoku', undefined, { maxQueries: 5 }).length).toBe(5);
  });
});

describe('autocomplete', () => {
  it('costruisce la URL corretta', () => {
    const u = new URL(autocompleteUrl('libro sudoku', 'stripbooks'));
    expect(u.hostname).toBe('completion.amazon.it');
    expect(u.searchParams.get('mid')).toBe('APJ6JRA9NG5V4');
    expect(u.searchParams.get('prefix')).toBe('libro sudoku');
  });
  it('parsa la risposta reale di amazon.it', async () => {
    const json = loadJsonFixture<unknown>('autocomplete-agenda-2027.json');
    const fetchImpl = async () => new Response(JSON.stringify(json), { status: 200 });
    const s = await fetchSuggestions(fetchImpl, { prefix: 'agenda 2027' });
    expect(s.length).toBeGreaterThan(0);
    expect(s[0]!.position).toBe(1);
    expect(s.every((x) => x.sourceQuery === 'agenda 2027')).toBe(true);
  });
  it('runSuggestionQueries deduplica e ordina', async () => {
    const json = loadJsonFixture<unknown>('autocomplete-agenda-2027.json');
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      return new Response(JSON.stringify(json), { status: 200 });
    };
    const { suggestions, errors } = await runSuggestionQueries(fetchImpl, ['agenda 2027', 'agenda 2027 a'], { minGapMs: 0 });
    expect(calls).toBe(2);
    expect(errors).toEqual([]);
    expect(new Set(suggestions.map((s) => s.normalized)).size).toBe(suggestions.length);
  });
});

describe('candidatePhrasesFromTitle', () => {
  it('genera frasi sensate da un titolo KDP', () => {
    const c = candidatePhrasesFromTitle(
      '1000+ Sudoku per Adulti: con 5 Livelli di Difficoltà Crescente: Principiante – Facile – Medio – Difficile – Estremo | Libro in Italiano completo con Istruzioni e Soluzioni',
    );
    expect(c).toContain('sudoku per adulti');
    expect(c.length).toBeGreaterThan(5);
    expect(c.every((p) => p.split(' ').length >= 2)).toBe(true);
  });
});

describe('urls', () => {
  it('search url e parse', () => {
    const u = buildSearchUrl('libro sudoku', 'stripbooks', 2);
    expect(u).toBe('https://www.amazon.it/s?k=libro+sudoku&i=stripbooks&page=2');
    expect(parseSearchUrl(u)).toEqual({ keyword: 'libro sudoku', alias: 'stripbooks', page: 2 });
  });
  it('extractAsin', () => {
    expect(extractAsin('B0CKHTRYS5')).toBe('B0CKHTRYS5');
    expect(extractAsin('https://www.amazon.it/1000-Sudoku/dp/B0CKHTRYS5/ref=sr_1_2?x=1')).toBe('B0CKHTRYS5');
    expect(extractAsin('ciao')).toBeNull();
  });
});

describe('csv', () => {
  it('formato Excel italiano', () => {
    const csv = toCsv([{ a: 'x;y', b: 7.5 }], [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('A;B\r\n"x;y";7,5\r\n');
  });
});

describe('job protocol', () => {
  it('valida e applica i default dei parametri', () => {
    const p = parseJobParams('deep_view', { keyword: 'agenda 2027' });
    expect(p.pages).toBe(2);
    expect(p.alias).toBe('stripbooks');
    expect(() => parseJobParams('reverse_asin', { asin: 'short', candidates: ['x'] })).toThrow();
  });
  it('schema job e payload progress con default', () => {
    const job = JobSchema.parse({ id: '7f1c4d2e-6b1a-4c3d-9e8f-0a1b2c3d4e5f', type: 'deep_view', params: {}, attempts: 1, progress: {} });
    expect(job.progress.done).toBe(0);
    const payload = ProgressPayloadSchema.parse({ progress: { done: 1, total: 2 } });
    expect(payload.serp).toEqual([]);
  });
  it('planner deep view', () => {
    const st = emptyDeepViewState();
    expect(nextDeepViewStep(st, { pages: 2, enrich: true, maxAsins: 100 })).toEqual({ kind: 'serp', pages: [1, 2] });
    st.serpDone = [1, 2];
    st.asins = Array.from({ length: 30 }, (_, i) => `B00000000${i}`);
    const step = nextDeepViewStep(st, { pages: 2, enrich: true, maxAsins: 100 });
    expect(step.kind).toBe('enrich');
    if (step.kind === 'enrich') expect(step.asins.length).toBe(12);
    st.enriched = st.asins;
    expect(nextDeepViewStep(st, { pages: 2, enrich: true, maxAsins: 100 })).toEqual({ kind: 'done' });
  });
});
