import 'server-only';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminClient } from './supabase/admin';

export interface ExtUser {
  userId: string;
  email: string | null;
  plan: string;
}

const lastTouched = new Map<string, number>();

/** Risolve il bearer token dell'estensione in un utente. Ritorna null se assente o non valido. */
export async function authenticateExtension(req: Request): Promise<ExtUser | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token.startsWith('rdl_')) return null;
  if (!process.env.SUPABASE_SECRET_KEY) return null;

  const hash = createHash('sha256').update(token).digest('hex');
  const db = adminClient();
  const { data: row } = await db
    .from('api_tokens')
    .select('id, user_id, revoked_at, profiles!inner(email, plan)')
    .eq('token_hash', hash)
    .maybeSingle();
  if (!row || row.revoked_at) return null;

  const now = Date.now();
  if ((lastTouched.get(row.id) ?? 0) < now - 5 * 60 * 1000) {
    lastTouched.set(row.id, now);
    void db.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
  }

  const profile = row.profiles as unknown as { email: string | null; plan: string };
  return { userId: row.user_id, email: profile.email, plan: profile.plan };
}

export function unauthorized() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Server non configurato: manca SUPABASE_SECRET_KEY in apps/web/.env.local (vedi README)' },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: 'Token non valido o mancante' }, { status: 401 });
}
