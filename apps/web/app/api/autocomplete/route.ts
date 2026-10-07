import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { proxyAutocomplete } from '@/lib/amazon/autocomplete-proxy';

/** Proxy verso l'autocomplete di amazon.it (CORS non consente la chiamata diretta dal browser). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const alias = url.searchParams.get('alias') ?? 'stripbooks';
  if (!q || q.length > 120) return NextResponse.json({ error: 'Parametro q mancante o troppo lungo' }, { status: 400 });
  if (!['stripbooks', 'digital-text', 'aps'].includes(alias)) {
    return NextResponse.json({ error: 'alias non valido' }, { status: 400 });
  }

  const result = await proxyAutocomplete(user.id, q, alias as 'stripbooks' | 'digital-text' | 'aps');
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.body, { headers: { 'cache-control': 'private, max-age=600' } });
}
