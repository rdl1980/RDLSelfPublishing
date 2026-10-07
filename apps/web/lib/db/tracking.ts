import 'server-only';

import { chunkArray } from '@rdl/core';
import { adminClient } from '@/lib/supabase/admin';
import { createJob } from './jobs';

/** Crea i job di tracking del giorno (idempotente grazie a dedupe_key). */
export async function materializeTrackingJobs(userId: string, date = new Date()): Promise<{ keywordJobs: number; asinJobs: number }> {
  const db = adminClient();
  const day = date.toISOString().slice(0, 10);
  let keywordJobs = 0;
  let asinJobs = 0;

  const { data: kws } = await db
    .from('tracked_keywords')
    .select('id, alias, pages, watch_asins, keyword:keywords(text)')
    .eq('user_id', userId)
    .eq('active', true);
  for (const k of kws ?? []) {
    const text = (k.keyword as unknown as { text: string } | null)?.text;
    if (!text) continue;
    await createJob(
      userId,
      'track_keyword',
      { trackedKeywordId: k.id, keyword: text, alias: k.alias, pages: k.pages, watchAsins: k.watch_asins },
      { dedupeKey: `track_keyword:${k.id}:${day}`, priority: 1 },
    );
    keywordJobs++;
  }

  const { data: asins } = await db.from('tracked_asins').select('id, asin').eq('user_id', userId).eq('active', true).order('created_at');
  const groups = chunkArray(asins ?? [], 10);
  for (const [i, g] of groups.entries()) {
    await createJob(
      userId,
      'track_asins',
      { trackedAsinIds: g.map((x) => x.id), asins: g.map((x) => x.asin) },
      { dedupeKey: `track_asins:${i}:${day}`, priority: 1 },
    );
    asinJobs++;
  }
  return { keywordJobs, asinJobs };
}
