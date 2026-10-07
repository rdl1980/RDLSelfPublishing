import { CompletePayloadSchema } from '@rdl/core';
import { NextResponse } from 'next/server';
import { completeJob, getJob } from '@/lib/db/jobs';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

export async function POST(req: Request, ctx: RouteContext<'/api/ext/jobs/[id]/complete'>) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const job = await getJob(user.userId, id);
  if (!job) return NextResponse.json({ error: 'Job non trovato' }, { status: 404 });
  if (job.status === 'done') return NextResponse.json({ ok: true, already: true });
  const parsed = CompletePayloadSchema.safeParse((await req.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  try {
    await completeJob(user.userId, job, parsed.data.result);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
