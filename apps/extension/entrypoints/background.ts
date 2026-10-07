import { BSR_ANCHORS_IT } from '@rdl/core';
import { api, apiFetch, ApiError } from '@/lib/api-client';
import { gcCache, getCachedProducts, putCachedProducts } from '@/lib/cache';
import type { ConfigReply, ConnectionStatus, Msg, Reply } from '@/lib/messages';
import { activeJobId, getPausedUntil, isRunning, pauseFor, resume, runPendingJobs } from '@/lib/orchestrator';
import { getSettings } from '@/lib/settings';
import { flushPending, getPending, sendOrQueue } from '@/lib/sync';

const PAUSE_MS = 30 * 60 * 1000;
const CONFIG_TTL_MS = 60 * 60 * 1000;

let configCache: { at: number; value: ConfigReply } | null = null;

async function testConnection(): Promise<ConnectionStatus> {
  try {
    const me = await api.me();
    return { connected: true, email: me.email, plan: me.plan };
  } catch (e) {
    const error = e instanceof ApiError ? `${e.status}: ${e.message}` : String(e);
    return { connected: false, error };
  }
}

async function setBadge(): Promise<void> {
  const paused = await getPausedUntil();
  const pending = (await getPending()).length;
  if (paused) {
    await chrome.action.setBadgeText({ text: '⏸' });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  } else if (isRunning()) {
    await chrome.action.setBadgeText({ text: '▶' });
    await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  } else if (pending) {
    await chrome.action.setBadgeText({ text: String(pending) });
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

async function getConfig(): Promise<ConfigReply> {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.value;
  try {
    const value = await apiFetch<ConfigReply>('/api/ext/config');
    configCache = { at: Date.now(), value };
    return value;
  } catch {
    return { anchors: BSR_ANCHORS_IT };
  }
}

/** Alarm giornaliero all'ora scelta nelle Opzioni: crea i job di tracking sul server e li esegue. */
async function scheduleDailyTracking(): Promise<void> {
  const { trackingHour } = await getSettings();
  const next = new Date();
  next.setHours(trackingHour, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  await chrome.alarms.create('tracking:daily', { when: next.getTime(), periodInMinutes: 24 * 60 });
}

async function runDailyTracking(): Promise<void> {
  const { apiToken } = await getSettings();
  if (!apiToken) return;
  // Evita doppie esecuzioni nello stesso giorno (es. riavvio di Chrome)
  const day = new Date().toISOString().slice(0, 10);
  const s = await chrome.storage.local.get('lastTrackingDay');
  if (s.lastTrackingDay === day) return;
  try {
    await apiFetch('/api/ext/jobs/materialize', { method: 'POST', body: '{}' });
    await chrome.storage.local.set({ lastTrackingDay: day });
    await triggerJobs('tracking');
  } catch (e) {
    console.warn('[RDL] tracking giornaliero non avviato:', e);
  }
}

async function triggerJobs(trigger: string): Promise<number> {
  void setBadge();
  const n = await runPendingJobs(trigger);
  void setBadge();
  return n;
}

async function handle<M extends Msg>(msg: M): Promise<Reply<M>> {
  switch (msg.type) {
    case 'status:get': {
      const r = {
        connection: await testConnection(),
        pausedUntil: await getPausedUntil(),
        activeJobs: isRunning() ? 1 : 0,
        activeJobId: activeJobId(),
        pendingSync: (await getPending()).length,
      };
      return r as Reply<M>;
    }
    case 'settings:get':
      return (await getSettings()) as Reply<M>;
    case 'api:test-token':
      configCache = null;
      return (await testConnection()) as Reply<M>;
    case 'config:get':
      return (await getConfig()) as Reply<M>;
    case 'products:get': {
      const { productCacheTtlMs } = await getSettings();
      return (await getCachedProducts(msg.asins, productCacheTtlMs)) as Reply<M>;
    }
    case 'cache:put': {
      await putCachedProducts(msg.items);
      return { ok: true } as Reply<M>;
    }
    case 'products:put': {
      await putCachedProducts(msg.items);
      const capturedAt = new Date().toISOString();
      const synced = await sendOrQueue({ kind: 'products', source: msg.source, items: msg.items.map((i) => ({ ...i, capturedAt })) });
      void setBadge();
      return { ok: true, synced } as Reply<M>;
    }
    case 'serp:ingest': {
      const synced = await sendOrQueue({
        kind: 'serp',
        serp: {
          keyword: msg.keyword,
          alias: msg.alias,
          page: msg.page,
          capturedAt: new Date().toISOString(),
          totalResultsText: msg.totalResultsText,
          totalResultsEst: msg.totalResultsEst,
          items: msg.items,
        },
      });
      void setBadge();
      return { ok: true, synced } as Reply<M>;
    }
    case 'track:asin': {
      try {
        await apiFetch('/api/ext/track/asin', { method: 'POST', body: JSON.stringify({ asin: msg.asin, label: msg.label }) });
        return { ok: true } as Reply<M>;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) } as Reply<M>;
      }
    }
    case 'track:status': {
      try {
        return (await apiFetch<{ tracked: string[] }>(`/api/ext/track/asin?asins=${msg.asins.join(',')}`)) as Reply<M>;
      } catch {
        return { tracked: [] as string[] } as unknown as Reply<M>;
      }
    }
    case 'bot:challenge': {
      const pausedUntil = await pauseFor(PAUSE_MS);
      void setBadge();
      console.warn('[RDL] verifica anti-bot su', msg.url, '— pausa 30 minuti');
      return { pausedUntil } as Reply<M>;
    }
    case 'jobs:run-now': {
      if (isRunning()) return { started: false } as Reply<M>;
      void triggerJobs('manual');
      return { started: true } as Reply<M>;
    }
    case 'tracking:run-now': {
      await chrome.storage.local.remove('lastTrackingDay');
      void runDailyTracking();
      return { ok: true } as Reply<M>;
    }
    case 'jobs:pause': {
      const pausedUntil = await pauseFor((msg.minutes ?? 60) * 60 * 1000);
      void setBadge();
      return { pausedUntil } as Reply<M>;
    }
    case 'jobs:resume': {
      await resume();
      void setBadge();
      return { ok: true } as Reply<M>;
    }
    case 'dev:save-fixture': {
      try {
        await chrome.downloads.download({
          url: 'data:text/html;charset=utf-8,' + encodeURIComponent(msg.html),
          filename: `rdl-fixtures/${msg.name.replace(/[^a-z0-9_-]+/gi, '_')}.html`,
          saveAs: false,
        });
        return { ok: true } as Reply<M>;
      } catch {
        return { ok: false } as Reply<M>;
      }
    }
  }
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg: Msg & { target?: string }, _sender, sendResponse) => {
    if (msg?.target === 'offscreen') return false; // destinato al documento offscreen
    handle(msg).then(sendResponse, (err) => sendResponse({ error: String(err) }));
    return true;
  });

  chrome.runtime.onInstalled.addListener(() => {
    void chrome.alarms.create('cache:gc', { periodInMinutes: 360 });
    void chrome.alarms.create('sync:retry', { periodInMinutes: 5 });
    void chrome.alarms.create('jobs:tick', { periodInMinutes: 1 });
    void scheduleDailyTracking();
  });
  chrome.runtime.onStartup.addListener(() => {
    void chrome.alarms.create('jobs:tick', { periodInMinutes: 1 });
    void scheduleDailyTracking();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) void scheduleDailyTracking();
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'cache:gc') {
      const { productCacheTtlMs } = await getSettings();
      await gcCache(productCacheTtlMs * 3);
    }
    if (alarm.name === 'sync:retry') {
      if ((await getPending()).length) await flushPending();
      await setBadge();
    }
    if (alarm.name === 'jobs:tick') {
      await triggerJobs('alarm');
    }
    if (alarm.name === 'tracking:daily') {
      await runDailyTracking();
    }
  });

  void setBadge();
});
