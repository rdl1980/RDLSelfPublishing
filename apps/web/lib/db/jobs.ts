import 'server-only';

import {
  JobParamsSchemas,
  summarizeNiche,
  type EnrichedData,
  type JobProgress,
  type JobType,
  type ProgressPayload,
  type SearchResultItem,
} from '@rdl/core';
import { adminClient } from '@/lib/supabase/admin';
import type { Json, Tables } from '@/lib/supabase/database.types';
import { generateAsinAlerts, generateRankAlerts } from './alerts';
import { computeCategorySummary, ingestCategoryPages } from './categories';
import { anchorsForUser, ingestProducts, ingestSerp } from './ingest';
import { updateKeywordDailySales } from './keyword-stats';

export type JobRow = Tables<'jobs'>;

export async function createJob(
  userId: string,
  type: JobType,
  params: unknown,
  opts: { dedupeKey?: string; priority?: number; scheduledFor?: string } = {},
): Promise<JobRow> {
  const parsed = JobParamsSchemas[type].parse(params);
  const db = adminClient();
  const { data, error } = await db
    .from('jobs')
    .insert({
      user_id: userId,
      type,
      params: parsed as unknown as Json,
      dedupe_key: opts.dedupeKey ?? null,
      priority: opts.priority ?? 0,
      scheduled_for: opts.scheduledFor ?? new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505' && opts.dedupeKey) {
      const { data: existing } = await db.from('jobs').select('*').eq('user_id', userId).eq('dedupe_key', opts.dedupeKey).single();
      if (existing) return existing;
    }
    throw error;
  }
  return data;
}

export async function claimJobs(userId: string, worker: string, limit = 2): Promise<{ jobs: JobRow[]; requeued: number }> {
  const db = adminClient();
  const { data: requeued } = await db.rpc('requeue_stale_jobs', { p_user_id: userId });
  const { data, error } = await db.rpc('claim_jobs', { p_user_id: userId, p_worker: worker, p_limit: limit });
  if (error) throw error;
  return { jobs: (data ?? []) as JobRow[], requeued: requeued ?? 0 };
}

export async function getJob(userId: string, id: string): Promise<JobRow | null> {
  const { data } = await adminClient().from('jobs').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  return data;
}

/** Applica un payload di avanzamento: heartbeat + ingest idempotente dei dati parziali. */
export async function applyProgress(userId: string, job: JobRow, payload: ProgressPayload): Promise<void> {
  const db = adminClient();
  const anchors = await anchorsForUser(userId);
  const source = job.type === 'deep_view' ? 'deep_view' : job.type === 'reverse_asin' ? 'reverse_asin' : 'tracker';

  const serpIds = new Map<string, string>();
  for (const s of payload.serp) {
    const r = await ingestSerp(userId, s, source, job.id);
    serpIds.set(`${s.keyword}|${s.page}`, r.snapshotId);
  }
  if (payload.products.length) {
    const productSource = job.type === 'deep_view' ? 'deep_view' : job.type === 'category_scan' ? 'category' : 'tracker';
    await ingestProducts(userId, payload.products, productSource, job.id, anchors);
  }
  if (payload.category.length) {
    const scanId = (job.params as { scanId?: string }).scanId;
    if (scanId) await ingestCategoryPages(userId, scanId, payload.category);
  }
  if (payload.ranks.length) {
    const { error } = await db.from('keyword_rank_snapshots').insert(
      payload.ranks.map((r) => ({
        user_id: userId,
        tracked_keyword_id: r.trackedKeywordId,
        asin: r.asin,
        found: r.found,
        page: r.page,
        position: r.position,
        organic_position: r.organicPosition,
        absolute_position: r.page && r.position ? (r.page - 1) * 48 + r.position : null,
        is_sponsored: r.isSponsored,
        job_id: job.id,
      })),
    );
    if (error) throw error;
  }
  if (payload.reverse.length) {
    const runId = (job.params as { runId?: string }).runId;
    if (runId) {
      const { error } = await db.from('reverse_asin_results').insert(
        payload.reverse.map((r) => ({
          run_id: runId,
          user_id: userId,
          keyword: r.keyword,
          asin: r.asin ?? (job.params as { asin?: string }).asin ?? null,
          found: r.found,
          page: r.page,
          position: r.position,
          organic_position: r.organicPosition,
          total_results_est: r.totalResultsEst,
        })),
      );
      if (error) throw error;
    }
  }

  const { error: uErr } = await db
    .from('jobs')
    .update({ progress: payload.progress as unknown as Json, heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', job.id);
  if (uErr) throw uErr;
}

export async function completeJob(userId: string, job: JobRow, result: Record<string, unknown>): Promise<void> {
  const db = adminClient();
  const now = new Date().toISOString();
  let finalResult: Record<string, unknown> = result;

  if (job.type === 'deep_view') {
    const summary = await computeDeepViewSummary(userId, job);
    finalResult = { ...result, summary };
    const deepViewId = (job.params as { deepViewId?: string }).deepViewId;
    if (deepViewId) {
      await db.from('deep_views').update({ summary: summary as unknown as Json }).eq('id', deepViewId);
      const { data: dv } = await db.from('deep_views').select('keyword_id, alias').eq('id', deepViewId).maybeSingle();
      if (dv) await updateKeywordDailySales(userId, dv.keyword_id, dv.alias, now.slice(0, 10), summary.estMonthlySalesTop10).catch(() => undefined);
    }
  }
  if (job.type === 'category_scan') {
    const scanId = (job.params as { scanId?: string }).scanId;
    if (scanId) {
      const summary = await computeCategorySummary(userId, scanId, job.id);
      finalResult = { ...result, summary };
    }
  }
  if (job.type === 'track_keyword') {
    const id = (job.params as { trackedKeywordId?: string }).trackedKeywordId;
    if (id) await db.from('tracked_keywords').update({ last_run_at: now }).eq('id', id);
    // Gli avvisi non devono mai far fallire il completamento del job
    const alerts = await generateRankAlerts(userId, job).catch((e: unknown) => {
      console.warn('[alerts] track_keyword', e);
      return 0;
    });
    finalResult = { ...finalResult, alerts };
  }
  if (job.type === 'track_asins') {
    const ids = (job.params as { trackedAsinIds?: string[] }).trackedAsinIds ?? [];
    if (ids.length) await db.from('tracked_asins').update({ last_run_at: now }).in('id', ids);
    const alerts = await generateAsinAlerts(userId, job).catch((e: unknown) => {
      console.warn('[alerts] track_asins', e);
      return 0;
    });
    finalResult = { ...finalResult, alerts };
  }

  await db
    .from('jobs')
    .update({ status: 'done', finished_at: now, updated_at: now, result: finalResult as unknown as Json })
    .eq('id', job.id);
}

export async function failJob(userId: string, job: JobRow, error: string, retryable: boolean, retryAfterMs?: number): Promise<void> {
  const db = adminClient();
  const now = new Date().toISOString();
  const canRetry = retryable && job.attempts < job.max_attempts;
  await db
    .from('jobs')
    .update({
      status: canRetry ? 'pending' : 'failed',
      error,
      scheduled_for: canRetry ? new Date(Date.now() + (retryAfterMs ?? 60_000)).toISOString() : job.scheduled_for,
      finished_at: canRetry ? null : now,
      updated_at: now,
    })
    .eq('id', job.id);
}

/** Righe arricchite di un Deep View: item SERP + ultimo snapshot prodotto raccolto dal job. */
export async function loadDeepViewRows(userId: string, jobId: string) {
  const db = adminClient();
  const { data: snaps } = await db.from('serp_snapshots').select('id, page').eq('job_id', jobId).eq('user_id', userId).order('page');
  const snapIds = (snaps ?? []).map((s) => s.id);
  const pageOf = new Map((snaps ?? []).map((s) => [s.id, s.page]));
  if (!snapIds.length) return { items: [] as (SearchResultItem & { page: number })[], products: new Map<string, Tables<'products'>>(), snapshots: new Map<string, Tables<'product_snapshots'>>() };

  const { data: items } = await db.from('serp_items').select('*').in('serp_snapshot_id', snapIds).order('position');
  const serpItems: (SearchResultItem & { page: number })[] = (items ?? []).map((i) => ({
    asin: i.asin,
    position: i.position,
    organicPosition: i.organic_position,
    isSponsored: i.is_sponsored,
    title: i.title,
    author: i.author,
    pubDate: i.pub_date,
    format: i.format as SearchResultItem['format'],
    priceCents: i.price_cents,
    rating: i.rating,
    reviewsCount: i.reviews_count,
    imageUrl: i.image_url,
    url: null,
    page: pageOf.get(i.serp_snapshot_id) ?? 1,
  }));
  // posizione assoluta tra le pagine
  serpItems.sort((a, b) => a.page - b.page || a.position - b.position);
  serpItems.forEach((it, idx) => (it.position = idx + 1));

  const asins = Array.from(new Set(serpItems.map((i) => i.asin)));
  const [{ data: products }, { data: psnaps }] = await Promise.all([
    asins.length ? db.from('products').select('*').in('asin', asins) : Promise.resolve({ data: [] as Tables<'products'>[] }),
    asins.length ? db.from('product_snapshots').select('*').eq('job_id', jobId).in('asin', asins).order('captured_at', { ascending: false }) : Promise.resolve({ data: [] as Tables<'product_snapshots'>[] }),
  ]);
  const productMap = new Map((products ?? []).map((p) => [p.asin, p]));
  const snapMap = new Map<string, Tables<'product_snapshots'>>();
  for (const s of psnaps ?? []) if (!snapMap.has(s.asin)) snapMap.set(s.asin, s);
  return { items: serpItems, products: productMap, snapshots: snapMap };
}

async function computeDeepViewSummary(userId: string, job: JobRow) {
  const { items, products, snapshots } = await loadDeepViewRows(userId, job.id);
  const anchors = await anchorsForUser(userId);
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
      product: p ? { isIndependent: p.is_independent, hasAplus: p.has_aplus ?? false, pubDate: p.pub_date } : undefined,
    });
  }
  return summarizeNiche(items, enriched, { anchors });
}

export function progressOf(job: JobRow): JobProgress {
  const p = (job.progress ?? {}) as Partial<JobProgress>;
  return { done: p.done ?? 0, total: p.total ?? 0, step: p.step ?? '', message: p.message, state: p.state };
}
