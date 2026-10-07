import type { ClaimResponse, Job } from '@rdl/core';
import { apiFetch, ApiError } from './api-client';
import type { ChunkError, ChunkResult } from './job-runner';
import { getSettings, type ExtSettings } from './settings';

const OFFSCREEN_URL = 'offscreen.html';
const MAX_CHUNKS_PER_JOB = 400;
const MAX_JOBS_PER_RUN = 10;

let running = false;
let currentJobId: string | null = null;

export const isRunning = () => running;
export const activeJobId = () => currentJobId;

export async function getPausedUntil(): Promise<number | null> {
  const s = await chrome.storage.session.get('pausedUntil');
  const v = s.pausedUntil as number | undefined;
  return v && v > Date.now() ? v : null;
}

export async function pauseFor(ms: number): Promise<number> {
  const pausedUntil = Date.now() + ms;
  await chrome.storage.session.set({ pausedUntil });
  return pausedUntil;
}

export async function resume(): Promise<void> {
  await chrome.storage.session.remove('pausedUntil');
}

async function installId(): Promise<string> {
  const s = await chrome.storage.local.get('installId');
  if (typeof s.installId === 'string') return s.installId;
  const id = 'ext-' + Math.random().toString(36).slice(2, 10);
  await chrome.storage.local.set({ installId: id });
  return id;
}

async function ensureOffscreen(): Promise<void> {
  const has = await chrome.offscreen.hasDocument?.();
  if (has) return;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Analisi delle pagine amazon.it richieste dall’utente (parsing HTML con DOMParser)',
    });
  } catch (e) {
    if (!String(e).includes('single offscreen')) throw e;
  }
}

async function closeOffscreen(): Promise<void> {
  try {
    if (await chrome.offscreen.hasDocument?.()) await chrome.offscreen.closeDocument();
  } catch {
    /* già chiuso */
  }
}

async function runChunkInOffscreen(job: Job, settings: ExtSettings): Promise<ChunkResult | ChunkError> {
  await ensureOffscreen();
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'job:run-chunk', job, settings })) as ChunkResult | ChunkError | undefined;
  if (!res) return { ok: false, error: 'Nessuna risposta dal worker offscreen', bot: false };
  return res;
}

/** Esegue un singolo job fino alla fine (o a un errore), inviando avanzamento a ogni chunk. */
async function runJob(job: Job, settings: ExtSettings): Promise<void> {
  currentJobId = job.id;
  let current: Job = job;
  try {
    for (let i = 0; i < MAX_CHUNKS_PER_JOB; i++) {
      if (await getPausedUntil()) {
        await apiFetch(`/api/ext/jobs/${job.id}/fail`, { method: 'POST', body: JSON.stringify({ error: 'In pausa per verifica anti-bot', retryable: true, retryAfterMs: 30 * 60 * 1000 }) });
        return;
      }
      const res = await runChunkInOffscreen(current, settings);
      if (!res.ok) {
        if (res.bot) await pauseFor(30 * 60 * 1000);
        await apiFetch(`/api/ext/jobs/${job.id}/fail`, {
          method: 'POST',
          body: JSON.stringify({ error: res.error, retryable: true, retryAfterMs: res.bot ? 30 * 60 * 1000 : 5 * 60 * 1000 }),
        });
        return;
      }
      const progress = { ...res.progress, state: res.state };
      try {
        await apiFetch(`/api/ext/jobs/${job.id}/progress`, { method: 'POST', body: JSON.stringify({ progress, ...res.payload }) });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) return; // annullato dalla web app
        throw e;
      }
      await chrome.storage.local.set({ [`jobState:${job.id}`]: res.state });
      if (res.done) {
        await apiFetch(`/api/ext/jobs/${job.id}/complete`, { method: 'POST', body: JSON.stringify({ result: { chunks: i + 1 } }) });
        await chrome.storage.local.remove(`jobState:${job.id}`);
        return;
      }
      current = { ...current, progress };
    }
    await apiFetch(`/api/ext/jobs/${job.id}/fail`, { method: 'POST', body: JSON.stringify({ error: 'Troppi chunk: job interrotto', retryable: false }) });
  } finally {
    currentJobId = null;
  }
}

/** Preleva ed esegue i job in coda. Ritorna quanti ne ha eseguiti. */
export async function runPendingJobs(trigger: string): Promise<number> {
  if (running) return 0;
  running = true;
  let executed = 0;
  try {
    const settings = await getSettings();
    if (!settings.apiToken) return 0;
    if (await getPausedUntil()) return 0;
    const worker = await installId();
    for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
      const { jobs } = await apiFetch<ClaimResponse>(`/api/ext/jobs/claim?limit=1&worker=${encodeURIComponent(worker)}`);
      if (!jobs.length) break;
      for (const job of jobs) {
        const saved = await chrome.storage.local.get(`jobState:${job.id}`);
        const localState = saved[`jobState:${job.id}`] as Record<string, unknown> | undefined;
        const merged = localState && !job.progress.state ? { ...job, progress: { ...job.progress, state: localState } } : job;
        await runJob(merged, settings);
        executed++;
      }
    }
  } catch (e) {
    console.warn(`[RDL] runPendingJobs (${trigger}):`, e);
  } finally {
    running = false;
    if (executed) void closeOffscreen();
  }
  return executed;
}
