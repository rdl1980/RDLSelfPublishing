import { sharedCandidatePool } from '@rdl/core';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob, loadDeepViewRows } from '@/lib/db/jobs';
import { adminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

const Body = z.object({
  topN: z.number().int().min(2).max(25).default(10),
  pages: z.number().int().min(1).max(3).default(2),
  maxKeywords: z.number().int().min(5).max(60).default(40),
});

/**
 * Reverse ASIN in massa: prende i primi N risultati organici di un Deep View, costruisce un pool
 * condiviso di keyword candidate dai loro titoli e lancia UN solo job reverse_asin che verifica tutti
 * gli ASIN con una ricerca per keyword (costo: keyword × pagine, non keyword × pagine × libri).
 */
export async function POST(req: Request, ctx: RouteContext<'/api/deep-view/[id]/reverse-bulk'>) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse((await req.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  const { topN, pages, maxKeywords } = parsed.data;

  const db = adminClient();
  const { data: dv } = await db
    .from('deep_views')
    .select('id, alias, job_id, keyword:keywords(text)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!dv?.job_id)
    return NextResponse.json({ error: 'Deep View non trovato o senza job' }, { status: 404 });
  const keyword = (dv.keyword as unknown as { text: string } | null)?.text ?? '';

  const { items, products } = await loadDeepViewRows(user.id, dv.job_id);
  const seen = new Set<string>();
  const top = items
    .filter((i) => !i.isSponsored && !seen.has(i.asin) && seen.add(i.asin))
    .slice(0, topN)
    .map((i) => ({
      asin: i.asin,
      title: i.title ?? products.get(i.asin)?.title ?? null,
      subtitle: products.get(i.asin)?.subtitle ?? null,
    }));
  if (top.length < 2)
    return NextResponse.json(
      { error: 'Servono almeno 2 risultati organici con titolo' },
      { status: 400 },
    );

  const candidates = sharedCandidatePool(top, [keyword], { max: maxKeywords });
  if (!candidates.length)
    return NextResponse.json({ error: 'Nessuna keyword candidata dai titoli' }, { status: 400 });

  const asins = top.map((t) => t.asin);
  const alias = dv.alias === 'digital-text' ? 'digital-text' : 'stripbooks';
  const { data: run, error } = await db
    .from('reverse_asin_runs')
    .insert({ user_id: user.id, asin: asins[0]!, candidates, deep_view_id: dv.id })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try {
    const job = await createJob(
      user.id,
      'reverse_asin',
      { asin: asins[0], asins, candidates, alias, pages, runId: run.id },
      { priority: 5 },
    );
    await db.from('reverse_asin_runs').update({ job_id: job.id }).eq('id', run.id);
    return NextResponse.json({
      runId: run.id,
      jobId: job.id,
      asins: asins.length,
      keywords: candidates.length,
      fetches: candidates.length * pages,
    });
  } catch (e) {
    await db.from('reverse_asin_runs').delete().eq('id', run.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
