import { NextResponse } from 'next/server';
import { materializeTrackingJobs } from '@/lib/db/tracking';
import { ADMIN_MISSING_MESSAGE, adminConfigured } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

/** Dalla web app: "Esegui il tracking oggi" (i job vengono poi eseguiti dall'estensione). */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: ADMIN_MISSING_MESSAGE }, { status: 503 });
  try {
    const r = await materializeTrackingJobs(user.id);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
