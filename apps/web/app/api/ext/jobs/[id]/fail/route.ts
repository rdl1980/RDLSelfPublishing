import { FailPayloadSchema } from '@rdl/core';
import { NextResponse } from 'next/server';
import { failJob, getJob } from '@/lib/db/jobs';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

export async function POST(req: Request, ctx: RouteContext<'/api/ext/jobs/[id]/fail'>) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const job = await getJob(user.userId, id);
  if (!job) return NextResponse.json({ error: 'Job non trovato' }, { status: 404 });
  const parsed = FailPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  await failJob(user.userId, job, parsed.data.error, parsed.data.retryable, parsed.data.retryAfterMs);
  return NextResponse.json({ ok: true });
}
