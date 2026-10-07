import type { SearchResultItem } from '@rdl/core';
import { apiFetch, ApiError } from './api-client';
import type { ParsedProductLite } from './messages';

export type PendingItem =
  | { kind: 'products'; source: 'quick_view' | 'product_page'; items: (ParsedProductLite & { capturedAt: string })[] }
  | {
      kind: 'serp';
      serp: {
        keyword: string;
        alias: string;
        page: number;
        capturedAt: string;
        totalResultsText: string | null;
        totalResultsEst: number | null;
        items: SearchResultItem[];
      };
    };

const KEY = 'pendingSync';
const MAX_PENDING = 200;

export async function getPending(): Promise<PendingItem[]> {
  const s = await chrome.storage.local.get(KEY);
  return (s[KEY] as PendingItem[] | undefined) ?? [];
}

async function setPending(items: PendingItem[]): Promise<void> {
  await chrome.storage.local.set({ [KEY]: items.slice(-MAX_PENDING) });
}

export async function enqueue(item: PendingItem): Promise<void> {
  const cur = await getPending();
  cur.push(item);
  await setPending(cur);
}

async function send(item: PendingItem): Promise<void> {
  if (item.kind === 'products') {
    const products = item.items
      .filter((p) => /^[A-Z0-9]{10}$/.test(p.product.asin))
      .map((p) => ({ product: p.product, snapshot: p.snapshot, capturedAt: p.capturedAt }));
    if (!products.length) return;
    await apiFetch('/api/ext/ingest/products', { method: 'POST', body: JSON.stringify({ source: item.source, products }) });
  } else {
    const alias = ['stripbooks', 'digital-text', 'aps'].includes(item.serp.alias) ? item.serp.alias : 'aps';
    await apiFetch('/api/ext/ingest/serp', { method: 'POST', body: JSON.stringify({ source: 'quick_view', serp: { ...item.serp, alias } }) });
  }
}

/** Prova a inviare subito; se fallisce per rete/server accoda per un tentativo successivo. Ritorna true se inviato. */
export async function sendOrQueue(item: PendingItem): Promise<boolean> {
  try {
    await send(item);
    return true;
  } catch (e) {
    // 400 = payload rifiutato: non ha senso riprovare. 401 = token mancante: accoda, l'utente lo configurerà.
    if (e instanceof ApiError && e.status === 400) {
      console.warn('[RDL] payload rifiutato dalla web app', e.message);
      return false;
    }
    await enqueue(item);
    return false;
  }
}

/** Svuota la coda. Si ferma al primo errore di rete/auth lasciando il resto in coda. */
export async function flushPending(): Promise<{ sent: number; left: number }> {
  const items = await getPending();
  let sent = 0;
  while (items.length) {
    const it = items[0]!;
    try {
      await send(it);
      items.shift();
      sent++;
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        items.shift();
        continue;
      }
      break;
    }
  }
  await setPending(items);
  return { sent, left: items.length };
}
