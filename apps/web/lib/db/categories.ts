import 'server-only';

import {
  summarizeNiche,
  type CategoryPagePayload,
  type EnrichedData,
  type SearchResultItem,
} from '@rdl/core';
import { adminClient } from '@/lib/supabase/admin';
import type { Json, Tables } from '@/lib/supabase/database.types';
import { anchorsForUser } from './ingest';

/** Salva le pagine di classifica ricevute da un job category_scan (idempotente per scan + asin). */
export async function ingestCategoryPages(
  userId: string,
  scanId: string,
  pages: CategoryPagePayload[],
): Promise<number> {
  const db = adminClient();
  let n = 0;
  for (const p of pages) {
    if (p.categoryName)
      await db
        .from('category_scans')
        .update({ category_name: p.categoryName })
        .eq('id', scanId)
        .is('category_name', null);
    if (!p.items.length) continue;
    const { error } = await db.from('category_scan_items').upsert(
      p.items.map((i) => ({
        scan_id: scanId,
        user_id: userId,
        asin: i.asin,
        rank: i.rank,
        title: i.title,
        author: i.author,
        format: i.format,
        price_cents: i.priceCents,
        rating: i.rating,
        reviews_count: i.reviewsCount,
        pub_date: null,
        image_url: i.imageUrl,
      })),
      { onConflict: 'scan_id,asin' },
    );
    if (error) throw error;
    n += p.items.length;
  }
  return n;
}

/** Righe di una scansione con l'ultimo snapshot prodotto raccolto dal job. */
export async function loadCategoryScanRows(userId: string, scanId: string, jobId: string | null) {
  const db = adminClient();
  const { data: items } = await db
    .from('category_scan_items')
    .select('*')
    .eq('scan_id', scanId)
    .eq('user_id', userId)
    .order('rank');
  const asins = (items ?? []).map((i) => i.asin);
  const [{ data: products }, { data: snaps }] = await Promise.all([
    asins.length
      ? db.from('products').select('*').in('asin', asins)
      : Promise.resolve({ data: [] as Tables<'products'>[] }),
    asins.length && jobId
      ? db
          .from('product_snapshots')
          .select('*')
          .eq('job_id', jobId)
          .in('asin', asins)
          .order('captured_at', { ascending: false })
      : Promise.resolve({ data: [] as Tables<'product_snapshots'>[] }),
  ]);
  const productMap = new Map((products ?? []).map((p) => [p.asin, p]));
  const snapMap = new Map<string, Tables<'product_snapshots'>>();
  for (const s of snaps ?? []) if (!snapMap.has(s.asin)) snapMap.set(s.asin, s);
  return { items: items ?? [], products: productMap, snapshots: snapMap };
}

/** Riepilogo di nicchia della classifica (stesse metriche del Deep View). */
export async function computeCategorySummary(userId: string, scanId: string, jobId: string | null) {
  const { items, products, snapshots } = await loadCategoryScanRows(userId, scanId, jobId);
  const anchors = await anchorsForUser(userId);
  const serpLike: SearchResultItem[] = items.map((i, idx) => ({
    asin: i.asin,
    position: idx + 1,
    organicPosition: idx + 1,
    isSponsored: false,
    title: i.title,
    author: i.author,
    pubDate: products.get(i.asin)?.pub_date ?? null,
    format: i.format as SearchResultItem['format'],
    priceCents: i.price_cents ?? snapshots.get(i.asin)?.price_cents ?? null,
    rating: i.rating,
    reviewsCount: i.reviews_count ?? snapshots.get(i.asin)?.reviews_count ?? null,
    imageUrl: i.image_url,
    url: null,
  }));
  const enriched = new Map<string, EnrichedData>();
  for (const [asin, s] of snapshots) {
    const p = products.get(asin);
    enriched.set(asin, {
      snapshot: {
        asin,
        bsr: s.bsr,
        bsrStore: (s.bsr_store as 'books' | 'kindle' | null) ?? null,
        categoryRanks: [],
        priceCents: s.price_cents,
        rating: s.rating,
        reviewsCount: s.reviews_count,
        formats: [],
      },
      product: p
        ? { isIndependent: p.is_independent, hasAplus: p.has_aplus ?? false, pubDate: p.pub_date }
        : undefined,
    });
  }
  const summary = summarizeNiche(serpLike, enriched, { anchors });
  await adminClient()
    .from('category_scans')
    .update({ summary: summary as unknown as Json })
    .eq('id', scanId);
  return summary;
}
