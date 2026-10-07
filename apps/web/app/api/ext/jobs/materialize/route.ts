import { NextResponse } from 'next/server';
import { materializeTrackingJobs } from '@/lib/db/tracking';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

/** Chiamata dall'alarm giornaliero dell'estensione: crea i job di tracking di oggi. */
export async function POST(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  try {
    const r = await materializeTrackingJobs(user.userId);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
