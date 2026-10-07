import 'server-only';

import { autocompleteUrl, type SearchAlias } from '@rdl/core';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const RATE_PER_SEC = 10;

const cache = new Map<string, { at: number; body: unknown }>();
const buckets = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(userId) ?? []).filter((t) => t > now - 1000);
  if (arr.length >= RATE_PER_SEC) {
    buckets.set(userId, arr);
    return true;
  }
  arr.push(now);
  buckets.set(userId, arr);
  return false;
}

export async function proxyAutocomplete(
  userId: string,
  prefix: string,
  alias: SearchAlias,
): Promise<{ body: unknown } | { error: string; status: number }> {
  if (rateLimited(userId)) return { error: 'Troppe richieste: rallenta', status: 429 };

  const key = `${alias}|${prefix.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - CACHE_TTL_MS) return { body: hit.body };

  const res = await fetch(autocompleteUrl(prefix, alias), {
    headers: {
      accept: 'application/json',
      'accept-language': 'it-IT,it;q=0.9',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RDLSelfPublishing/0.1',
    },
    signal: AbortSignal.timeout(8000),
  }).catch((e: unknown) => ({ ok: false, status: 502, statusText: e instanceof Error ? e.message : 'fetch failed' }) as Response);

  if (!res.ok) return { error: `Amazon ha risposto ${res.status} ${res.statusText}`, status: 502 };
  const body: unknown = await res.json();

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), body });
  return { body };
}
