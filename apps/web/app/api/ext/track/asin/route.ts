import { AsinSchema } from '@rdl/core';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';
import { adminClient } from '@/lib/supabase/admin';

const Body = z.object({ asin: AsinSchema, label: z.string().max(200).optional(), isMine: z.boolean().optional() });

/** Aggiunge (o riattiva) un ASIN al tracking dell'utente. */
export async function POST(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  const { asin, label, isMine } = parsed.data;
  const db = adminClient();
  const { data, error } = await db
    .from('tracked_asins')
    .upsert({ user_id: user.userId, asin, label: label ?? null, is_mine: isMine ?? false, active: true }, { onConflict: 'user_id,asin' })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, trackedAsinId: data.id });
}

/** Stato di tracking per una lista di ASIN (per mostrare il pulsante giusto). */
export async function GET(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const asins = (new URL(req.url).searchParams.get('asins') ?? '').split(',').filter((a) => AsinSchema.safeParse(a).success);
  if (!asins.length) return NextResponse.json({ tracked: [] });
  const { data } = await adminClient().from('tracked_asins').select('asin').eq('user_id', user.userId).eq('active', true).in('asin', asins);
  return NextResponse.json({ tracked: (data ?? []).map((r) => r.asin) });
}
