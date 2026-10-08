import {
  BotChallengeError,
  buildSearchUrl,
  emptyDeepViewState,
  ENRICH_CHUNK_SIZE,
  nextDeepViewStep,
  nextReverseAsinStep,
  parseJobParams,
  parseProductPage,
  parseSearchPage,
  productUrl,
  type DeepViewState,
  type Job,
  type JobProgress,
  type ProductPayload,
  type ReverseAsinState,
  type SearchAlias,
  type SerpPayload,
} from '@rdl/core';
import { fetchAmazonDocument } from './fetch-amazon';
import { sendMessage } from './messages';
import type { ExtSettings } from './settings';
import { runPool } from './throttle';

/** Esito di un chunk: dati parziali da inviare al server, nuovo stato, avanzamento e flag di fine. */
export interface ChunkResult {
  ok: true;
  done: boolean;
  state: Record<string, unknown>;
  progress: Omit<JobProgress, 'state'>;
  payload: {
    serp: SerpPayload[];
    products: ProductPayload[];
    ranks: { trackedKeywordId: string; asin: string; found: boolean; page: number | null; position: number | null; organicPosition: number | null; isSponsored: boolean | null }[];
    reverse: { keyword: string; found: boolean; page: number | null; position: number | null; organicPosition: number | null; totalResultsEst: number | null }[];
  };
}
export interface ChunkError {
  ok: false;
  error: string;
  bot: boolean;
}

const now = () => new Date().toISOString();

async function fetchSerp(keyword: string, alias: SearchAlias, page: number): Promise<SerpPayload> {
  const doc = await fetchAmazonDocument(buildSearchUrl(keyword, alias, page));
  const serp = parseSearchPage(doc, { keyword, alias, page });
  return {
    keyword,
    alias,
    page,
    capturedAt: now(),
    totalResultsText: serp.totalResultsText,
    totalResultsEst: serp.totalResultsEst,
    items: serp.items,
  };
}

async function enrichAsins(asins: string[], settings: ExtSettings): Promise<{ products: ProductPayload[]; failed: string[]; bot: boolean }> {
  const products: ProductPayload[] = [];
  const failed: string[] = [];
  let bot = false;
  // cache dal service worker (24h) per non riscaricare pagine note
  const cached = await sendMessage({ type: 'products:get', asins }).catch(() => ({ hits: {}, misses: asins }));
  for (const c of Object.values(cached.hits)) products.push({ product: c.product, snapshot: c.snapshot, capturedAt: new Date(c.fetchedAt).toISOString() });
  const fresh: { product: ProductPayload['product']; snapshot: ProductPayload['snapshot'] }[] = [];
  const { errors } = await runPool(
    cached.misses,
    async (asin) => {
      const doc = await fetchAmazonDocument(productUrl(asin));
      const parsed = parseProductPage(doc, { asin });
      if (!/^[A-Z0-9]{10}$/.test(parsed.product.asin)) parsed.product.asin = asin;
      parsed.snapshot.asin = parsed.product.asin;
      products.push({ product: parsed.product, snapshot: parsed.snapshot, capturedAt: now() });
      fresh.push({ product: parsed.product, snapshot: parsed.snapshot });
    },
    { concurrency: settings.concurrency },
  );
  for (const { item, error } of errors) {
    failed.push(item);
    if (error instanceof BotChallengeError) bot = true;
  }
  if (fresh.length) void sendMessage({ type: 'cache:put', items: fresh }).catch(() => undefined);
  return { products, failed, bot };
}

export async function runChunk(job: Job, settings: ExtSettings): Promise<ChunkResult | ChunkError> {
  try {
    switch (job.type) {
      case 'deep_view':
        return await runDeepView(job, settings);
      case 'reverse_asin':
        return await runReverseAsin(job, settings);
      case 'track_keyword':
        return await runTrackKeyword(job, settings);
      case 'track_asins':
      case 'enrich_asins':
        return await runTrackAsins(job, settings);
      default:
        return { ok: false, error: `Tipo di job non supportato: ${job.type}`, bot: false };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), bot: e instanceof BotChallengeError };
  }
}

async function runDeepView(job: Job, settings: ExtSettings): Promise<ChunkResult> {
  const params = parseJobParams('deep_view', job.params);
  const state: DeepViewState = { ...emptyDeepViewState(), ...((job.progress.state as Partial<DeepViewState>) ?? {}) };
  const payload: ChunkResult['payload'] = { serp: [], products: [], ranks: [], reverse: [] };
  const step = nextDeepViewStep(state, params);
  // Totale per la barra di avanzamento: finché la SERP non è completa si stima ~48 risultati per pagina,
  // poi si usa il numero reale di ASIN trovati (così un Deep View con 3 risultati non mostra 4/98).
  const total = () => {
    const serpComplete = state.serpDone.length >= params.pages;
    const enrich = params.enrich ? Math.min(params.maxAsins, serpComplete ? state.asins.length : Math.max(state.asins.length, params.pages * 48)) : 0;
    return params.pages + enrich;
  };

  if (step.kind === 'serp') {
    for (const page of step.pages) {
      const serp = await fetchSerp(params.keyword, params.alias, page);
      payload.serp.push(serp);
      state.serpDone.push(page);
      for (const it of serp.items) if (!state.asins.includes(it.asin) && state.asins.length < params.maxAsins) state.asins.push(it.asin);
    }
    const done = nextDeepViewStep(state, params).kind === 'done';
    return { ok: true, done, state, progress: { done: state.serpDone.length, total: total(), step: 'serp', message: `${state.serpDone.length}/${params.pages} pagine, ${state.asins.length} ASIN` }, payload };
  }
  if (step.kind === 'enrich') {
    const { products, failed, bot } = await enrichAsins(step.asins, settings);
    payload.products = products;
    // gli ASIN falliti vengono comunque segnati come elaborati per non bloccare il job (riprovati solo se bot)
    state.enriched.push(...step.asins.filter((a) => !failed.includes(a) || !bot));
    if (bot) throw new BotChallengeError('enrich');
    const done = nextDeepViewStep(state, params).kind === 'done';
    return {
      ok: true,
      done,
      state,
      progress: { done: params.pages + state.enriched.length, total: total(), step: 'enrich', message: `${state.enriched.length}/${Math.min(params.maxAsins, state.asins.length)} prodotti` },
      payload,
    };
  }
  return { ok: true, done: true, state, progress: { done: total(), total: total(), step: 'done' }, payload };
}

async function runReverseAsin(job: Job, _settings: ExtSettings): Promise<ChunkResult> {
  const params = parseJobParams('reverse_asin', job.params);
  const state: ReverseAsinState = { checked: [], ...((job.progress.state as Partial<ReverseAsinState>) ?? {}) };
  const payload: ChunkResult['payload'] = { serp: [], products: [], ranks: [], reverse: [] };
  const step = nextReverseAsinStep(state, params.candidates);
  if (step.kind === 'done') return { ok: true, done: true, state, progress: { done: params.candidates.length, total: params.candidates.length, step: 'done' }, payload };

  for (const keyword of step.keywords) {
    let result: ChunkResult['payload']['reverse'][number] = { keyword, found: false, page: null, position: null, organicPosition: null, totalResultsEst: null };
    for (let page = 1; page <= params.pages; page++) {
      const serp = await fetchSerp(keyword, params.alias, page);
      if (page === 1) result.totalResultsEst = serp.totalResultsEst;
      const hit = serp.items.find((i) => i.asin === params.asin);
      if (hit) {
        result = { keyword, found: true, page, position: hit.position, organicPosition: hit.organicPosition, totalResultsEst: result.totalResultsEst };
        break;
      }
      if (serp.items.length < 10) break; // ultima pagina
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    }
    payload.reverse.push(result);
    state.checked.push(keyword);
  }
  const done = nextReverseAsinStep(state, params.candidates).kind === 'done';
  return { ok: true, done, state, progress: { done: state.checked.length, total: params.candidates.length, step: 'check', message: `${payload.reverse.filter((r) => r.found).length} trovate in questo blocco` }, payload };
}

async function runTrackKeyword(job: Job, settings: ExtSettings): Promise<ChunkResult> {
  void settings;
  const params = parseJobParams('track_keyword', job.params);
  const state = { pagesDone: 0, found: {} as Record<string, { page: number; position: number; organicPosition: number | null; isSponsored: boolean }>, ...((job.progress.state as Record<string, unknown>) ?? {}) } as {
    pagesDone: number;
    found: Record<string, { page: number; position: number; organicPosition: number | null; isSponsored: boolean }>;
  };
  const payload: ChunkResult['payload'] = { serp: [], products: [], ranks: [], reverse: [] };
  const batchEnd = Math.min(params.pages, state.pagesDone + 3);
  for (let page = state.pagesDone + 1; page <= batchEnd; page++) {
    const serp = await fetchSerp(params.keyword, params.alias, page);
    payload.serp.push(serp);
    for (const asin of params.watchAsins) {
      if (state.found[asin]) continue;
      const hit = serp.items.find((i) => i.asin === asin);
      if (hit) state.found[asin] = { page, position: hit.position, organicPosition: hit.organicPosition, isSponsored: hit.isSponsored };
    }
    state.pagesDone = page;
    if (serp.items.length < 10) {
      state.pagesDone = params.pages;
      break;
    }
  }
  const done = state.pagesDone >= params.pages;
  if (done) {
    for (const asin of params.watchAsins) {
      const f = state.found[asin];
      payload.ranks.push(
        f
          ? { trackedKeywordId: params.trackedKeywordId, asin, found: true, page: f.page, position: f.position, organicPosition: f.organicPosition, isSponsored: f.isSponsored }
          : { trackedKeywordId: params.trackedKeywordId, asin, found: false, page: null, position: null, organicPosition: null, isSponsored: null },
      );
    }
  }
  return { ok: true, done, state, progress: { done: state.pagesDone, total: params.pages, step: 'serp' }, payload };
}

async function runTrackAsins(job: Job, settings: ExtSettings): Promise<ChunkResult> {
  const params = job.type === 'track_asins' ? parseJobParams('track_asins', job.params) : parseJobParams('enrich_asins', job.params);
  const state = { done: [] as string[], ...((job.progress.state as { done?: string[] }) ?? {}) } as { done: string[] };
  const payload: ChunkResult['payload'] = { serp: [], products: [], ranks: [], reverse: [] };
  const todo = params.asins.filter((a) => !state.done.includes(a)).slice(0, ENRICH_CHUNK_SIZE);
  if (todo.length) {
    const { products, failed, bot } = await enrichAsins(todo, settings);
    payload.products = products;
    state.done.push(...todo.filter((a) => !failed.includes(a) || !bot));
    if (bot) throw new BotChallengeError('track');
  }
  const done = params.asins.every((a) => state.done.includes(a));
  return { ok: true, done, state, progress: { done: state.done.length, total: params.asins.length, step: 'enrich' }, payload };
}
