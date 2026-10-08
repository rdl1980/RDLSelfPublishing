import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMIN_MISSING_MESSAGE, adminClient, adminConfigured } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export async function GET(_req: Request, ctx: RouteContext<'/api/jobs/[id]'>) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: ADMIN_MISSING_MESSAGE }, { status: 503 });
  const { id } = await ctx.params;
  const { data } = await adminClient().from('jobs').select('id, type, status, progress, error, attempts, created_at, finished_at, heartbeat_at').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  return NextResponse.json(data);
}

const Action = z.object({ action: z.enum(['cancel', 'retry']) });

export async function POST(req: Request, ctx: RouteContext<'/api/jobs/[id]'>) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: ADMIN_MISSING_MESSAGE }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = Action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
  const db = adminClient();
  const now = new Date().toISOString();
  const patch =
    parsed.data.action === 'cancel'
      ? { status: 'cancelled' as const, finished_at: now, updated_at: now }
      : { status: 'pending' as const, error: null, attempts: 0, scheduled_for: now, finished_at: null, updated_at: now };
  const { error } = await db.from('jobs').update(patch).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
