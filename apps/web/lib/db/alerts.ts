import 'server-only';

import {
  asinAlerts,
  rankAlerts,
  resolveAlertThresholds,
  type AlertDraft,
  type AlertThresholds,
} from '@rdl/core';
import { parseProfileSettings } from '@/lib/settings';
import { adminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import type { JobRow } from './jobs';

export async function thresholdsForUser(userId: string): Promise<AlertThresholds> {
  const { data } = await adminClient()
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();
  return resolveAlertThresholds(parseProfileSettings(data?.settings).alerts);
}

async function labelsFor(userId: string, asins: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!asins.length) return out;
  const db = adminClient();
  const [{ data: tracked }, { data: products }] = await Promise.all([
    db.from('tracked_asins').select('asin, label').eq('user_id', userId).in('asin', asins),
    db.from('products').select('asin, title').in('asin', asins),
  ]);
  for (const p of products ?? []) if (p.title) out.set(p.asin, p.title.slice(0, 60));
  for (const t of tracked ?? []) if (t.label) out.set(t.asin, t.label.slice(0, 60));
  return out;
}

async function insertAlerts(
  userId: string,
  jobId: string | null,
  trackedKeywordId: string | null,
  drafts: AlertDraft[],
): Promise<number> {
  if (!drafts.length) return 0;
  const { error } = await adminClient()
    .from('alerts')
    .insert(
      drafts.map((d) => ({
        user_id: userId,
        kind: d.kind,
        severity: d.severity,
        asin: d.asin,
        tracked_keyword_id: trackedKeywordId,
        keyword: d.keyword,
        message: d.message,
        data: d.data as unknown as Json,
        job_id: jobId,
      })),
    );
  if (error) throw error;
  return drafts.length;
}

/** Avvisi di posizionamento dopo un job track_keyword: ultima rilevazione di oggi vs ultima di un giorno precedente. */
export async function generateRankAlerts(userId: string, job: JobRow): Promise<number> {
  const params = job.params as {
    trackedKeywordId?: string;
    keyword?: string;
    watchAsins?: string[];
  };
  if (!params.trackedKeywordId || !params.watchAsins?.length) return 0;
  const db = adminClient();
  const t = await thresholdsForUser(userId);
  const labels = await labelsFor(userId, params.watchAsins);
  const { data: snaps } = await db
    .from('keyword_rank_snapshots')
    .select('asin, captured_at, found, absolute_position')
    .eq('tracked_keyword_id', params.trackedKeywordId)
    .in('asin', params.watchAsins)
    .order('captured_at', { ascending: false })
    .limit(params.watchAsins.length * 60);

  const drafts: AlertDraft[] = [];
  for (const asin of params.watchAsins) {
    const rows = (snaps ?? []).filter((s) => s.asin === asin);
    const latest = rows[0];
    if (!latest) continue;
    const day = latest.captured_at.slice(0, 10);
    const prev = rows.find((s) => s.captured_at.slice(0, 10) !== day);
    if (!prev) continue;
    const keyword = params.keyword ?? '';
    drafts.push(
      ...rankAlerts(
        { asin, keyword, position: prev.found ? prev.absolute_position : null },
        { asin, keyword, position: latest.found ? latest.absolute_position : null },
        t,
        labels.get(asin),
      ),
    );
  }
  return insertAlerts(userId, job.id, params.trackedKeywordId, drafts);
}

/** Avvisi su BSR, prezzo e recensioni dopo un job track_asins. */
export async function generateAsinAlerts(userId: string, job: JobRow): Promise<number> {
  const params = job.params as { asins?: string[] };
  if (!params.asins?.length) return 0;
  const db = adminClient();
  const t = await thresholdsForUser(userId);
  const labels = await labelsFor(userId, params.asins);
  const { data: snaps } = await db
    .from('product_snapshots')
    .select('asin, captured_at, bsr, price_cents, reviews_count')
    .in('asin', params.asins)
    .order('captured_at', { ascending: false })
    .limit(params.asins.length * 60);

  const drafts: AlertDraft[] = [];
  for (const asin of params.asins) {
    const rows = (snaps ?? []).filter((s) => s.asin === asin);
    const latest = rows[0];
    if (!latest) continue;
    const day = latest.captured_at.slice(0, 10);
    const prev = rows.find((s) => s.captured_at.slice(0, 10) !== day);
    if (!prev) continue;
    drafts.push(
      ...asinAlerts(
        { asin, bsr: prev.bsr, priceCents: prev.price_cents, reviewsCount: prev.reviews_count },
        {
          asin,
          bsr: latest.bsr,
          priceCents: latest.price_cents,
          reviewsCount: latest.reviews_count,
        },
        t,
        labels.get(asin),
      ),
    );
  }
  return insertAlerts(userId, job.id, null, drafts);
}

export async function unreadAlertsCount(userId: string): Promise<number> {
  const { count } = await adminClient()
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}
