import type { ParsedProduct } from '@rdl/core';

export interface CachedProduct {
  product: ParsedProduct['product'];
  snapshot: ParsedProduct['snapshot'];
  fetchedAt: number;
}

const PREFIX = 'product:';

export async function getCachedProducts(asins: string[], ttlMs: number): Promise<{ hits: Record<string, CachedProduct>; misses: string[] }> {
  const keys = asins.map((a) => PREFIX + a);
  const stored = await chrome.storage.local.get(keys);
  const hits: Record<string, CachedProduct> = {};
  const misses: string[] = [];
  const now = Date.now();
  for (const asin of asins) {
    const v = stored[PREFIX + asin] as CachedProduct | undefined;
    if (v && now - v.fetchedAt < ttlMs) hits[asin] = v;
    else misses.push(asin);
  }
  return { hits, misses };
}

export async function putCachedProducts(items: { product: ParsedProduct['product']; snapshot: ParsedProduct['snapshot'] }[]): Promise<void> {
  const now = Date.now();
  const entries: Record<string, CachedProduct> = {};
  for (const it of items) entries[PREFIX + it.product.asin] = { product: it.product, snapshot: it.snapshot, fetchedAt: now };
  await chrome.storage.local.set(entries);
}

/** Rimuove le voci più vecchie di maxAgeMs. */
export async function gcCache(maxAgeMs: number): Promise<number> {
  const all = await chrome.storage.local.get(null);
  const now = Date.now();
  const stale = Object.entries(all)
    .filter(([k, v]) => k.startsWith(PREFIX) && now - ((v as CachedProduct).fetchedAt ?? 0) > maxAgeMs)
    .map(([k]) => k);
  if (stale.length) await chrome.storage.local.remove(stale);
  return stale.length;
}
