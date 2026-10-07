import 'server-only';

import {
  estimateDailySales,
  normalizeKeyword,
  type BsrAnchor,
  type BsrStore,
  type ProductPayload,
  type SerpPayload,
} from '@rdl/core';
import { anchorsFromSettings, parseProfileSettings } from '@/lib/settings';
import { adminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';

export type SnapshotSource = 'quick_view' | 'product_page' | 'deep_view' | 'tracker' | 'manual';
export type SerpSource = 'quick_view' | 'deep_view' | 'tracker' | 'reverse_asin';

export async function anchorsForUser(userId: string): Promise<Record<BsrStore, BsrAnchor[]>> {
  const db = adminClient();
  const { data } = await db.from('profiles').select('settings').eq('id', userId).maybeSingle();
  return anchorsFromSettings(parseProfileSettings(data?.settings));
}

/** Trova o crea la keyword dell'utente (bypass RLS, ma sempre scoped per user_id). */
export async function ensureKeywordAdmin(userId: string, text: string): Promise<string> {
  const db = adminClient();
  const normalized = normalizeKeyword(text);
  const { data: existing } = await db
    .from('keywords')
    .select('id')
    .eq('user_id', userId)
    .eq('marketplace', 'it')
    .eq('normalized', normalized)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db
    .from('keywords')
    .insert({ user_id: userId, marketplace: 'it', text: text.trim(), normalized })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Upsert dei prodotti (cache condivisa) e inserimento degli snapshot. Idempotente per asin. */
export async function ingestProducts(
  userId: string,
  payloads: ProductPayload[],
  source: SnapshotSource,
  jobId: string | null = null,
  anchors?: Record<BsrStore, BsrAnchor[]>,
): Promise<{ products: number; snapshots: number }> {
  if (!payloads.length) return { products: 0, snapshots: 0 };
  const db = adminClient();
  const a = anchors ?? (await anchorsForUser(userId));
  const now = new Date().toISOString();

  const rows = payloads.map(({ product }) => ({
    asin: product.asin,
    marketplace: 'it',
    title: product.title,
    subtitle: product.subtitle,
    authors: product.authors,
    image_url: product.imageUrl,
    format: product.format,
    publisher: product.publisher,
    is_independent: product.isIndependent,
    pub_date: product.pubDate,
    language: product.language,
    page_count: product.pageCount,
    isbn13: product.isbn13,
    dimensions: product.dimensions,
    has_aplus: product.hasAplus,
    categories: product.categories as unknown as Json,
    created_by: userId,
    last_seen_at: now,
    updated_at: now,
  }));
  // created_by non deve sovrascrivere il primo autore: lo togliamo dall'update tramite ignoreDuplicates=false + merge manuale
  const { error: pErr } = await db.from('products').upsert(rows, { onConflict: 'asin' });
  if (pErr) throw pErr;

  const snaps = payloads.map(({ snapshot, capturedAt }) => ({
    asin: snapshot.asin,
    captured_at: capturedAt,
    source,
    job_id: jobId,
    bsr: snapshot.bsr,
    bsr_store: snapshot.bsrStore,
    category_ranks: snapshot.categoryRanks as unknown as Json,
    price_cents: snapshot.priceCents,
    rating: snapshot.rating,
    reviews_count: snapshot.reviewsCount,
    formats: snapshot.formats as unknown as Json,
    est_daily_sales: estimateDailySales(snapshot.bsr, snapshot.bsrStore ?? 'books', a),
  }));
  const { error: sErr } = await db.from('product_snapshots').insert(snaps);
  if (sErr) throw sErr;
  return { products: rows.length, snapshots: snaps.length };
}

/** Inserisce uno snapshot SERP con i suoi item. Con jobId dedupe su (job, keyword, page). */
export async function ingestSerp(
  userId: string,
  payload: SerpPayload,
  source: SerpSource,
  jobId: string | null = null,
): Promise<{ snapshotId: string; items: number; keywordId: string }> {
  const db = adminClient();
  const keywordId = await ensureKeywordAdmin(userId, payload.keyword);

  if (jobId) {
    const { data: dup } = await db
      .from('serp_snapshots')
      .select('id')
      .eq('job_id', jobId)
      .eq('keyword_id', keywordId)
      .eq('page', payload.page)
      .maybeSingle();
    if (dup) return { snapshotId: dup.id, items: 0, keywordId };
  }

  const organic = payload.items.filter((i) => !i.isSponsored).length;
  const { data: snap, error } = await db
    .from('serp_snapshots')
    .insert({
      user_id: userId,
      keyword_id: keywordId,
      alias: payload.alias,
      page: payload.page,
      captured_at: payload.capturedAt,
      source,
      job_id: jobId,
      total_results_text: payload.totalResultsText,
      total_results_est: payload.totalResultsEst,
      organic_count: organic,
      sponsored_count: payload.items.length - organic,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (payload.items.length) {
    const { error: iErr } = await db.from('serp_items').insert(
      payload.items.map((i) => ({
        serp_snapshot_id: snap.id,
        user_id: userId,
        asin: i.asin,
        position: i.position,
        organic_position: i.organicPosition,
        is_sponsored: i.isSponsored,
        title: i.title,
        author: i.author,
        format: i.format,
        price_cents: i.priceCents,
        rating: i.rating,
        reviews_count: i.reviewsCount,
        pub_date: i.pubDate,
        image_url: i.imageUrl,
      })),
    );
    if (iErr) throw iErr;
  }
  return { snapshotId: snap.id, items: payload.items.length, keywordId };
}
