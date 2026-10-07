import { ProgressPayloadSchema } from '@rdl/core';
import { NextResponse } from 'next/server';
import { applyProgress, getJob } from '@/lib/db/jobs';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

export async function POST(req: Request, ctx: RouteContext<'/api/ext/jobs/[id]/progress'>) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const job = await getJob(user.userId, id);
  if (!job) return NextResponse.json({ error: 'Job non trovato' }, { status: 404 });
  if (job.status !== 'running') return NextResponse.json({ error: `Job in stato ${job.status}`, status: job.status }, { status: 409 });
  const parsed = ProgressPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido', issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  try {
    await applyProgress(user.userId, job, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
