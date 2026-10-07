import { JOB_TYPES, type JobType } from '@rdl/core';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob } from '@/lib/db/jobs';
import { adminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

const Body = z.object({ type: z.enum(JOB_TYPES), params: z.record(z.string(), z.unknown()), priority: z.number().int().optional() });

/** Crea un job dalla web app (sessione utente). Per deep_view/reverse_asin crea anche la riga di contesto. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  const { type, params, priority } = parsed.data;
  const db = adminClient();
  try {
    if (type === 'deep_view') {
      const keyword = String(params.keyword ?? '').trim();
      const alias = String(params.alias ?? 'stripbooks');
      const pages = Number(params.pages ?? 2);
      const { ensureKeywordAdmin } = await import('@/lib/db/ingest');
      const keywordId = await ensureKeywordAdmin(user.id, keyword);
      const { data: dv, error } = await db.from('deep_views').insert({ user_id: user.id, keyword_id: keywordId, alias, pages }).select('id').single();
      if (error) throw error;
      const job = await createJob(user.id, type, { ...params, deepViewId: dv.id }, { priority: priority ?? 5 });
      await db.from('deep_views').update({ job_id: job.id }).eq('id', dv.id);
      return NextResponse.json({ jobId: job.id, deepViewId: dv.id });
    }
    if (type === 'reverse_asin') {
      const { data: run, error } = await db
        .from('reverse_asin_runs')
        .insert({ user_id: user.id, asin: String(params.asin), candidates: (params.candidates ?? []) as string[] })
        .select('id')
        .single();
      if (error) throw error;
      const job = await createJob(user.id, type, { ...params, runId: run.id }, { priority: priority ?? 5 });
      await db.from('reverse_asin_runs').update({ job_id: job.id }).eq('id', run.id);
      return NextResponse.json({ jobId: job.id, runId: run.id });
    }
    const job = await createJob(user.id, type as JobType, params, { priority });
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const { data } = await adminClient().from('jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ jobs: data ?? [] });
}
