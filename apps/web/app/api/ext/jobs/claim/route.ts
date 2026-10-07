import { NextResponse } from 'next/server';
import { claimJobs, progressOf } from '@/lib/db/jobs';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

export async function GET(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const limit = Math.min(3, Math.max(1, Number(url.searchParams.get('limit') ?? '1') || 1));
  const worker = (url.searchParams.get('worker') ?? 'ext').slice(0, 80);
  try {
    const { jobs, requeued } = await claimJobs(user.userId, worker, limit);
    return NextResponse.json({
      requeued,
      jobs: jobs.map((j) => ({ id: j.id, type: j.type, params: j.params, attempts: j.attempts, progress: progressOf(j) })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
