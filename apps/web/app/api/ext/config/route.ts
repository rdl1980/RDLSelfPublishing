import { NextResponse } from 'next/server';
import { anchorsForUser } from '@/lib/db/ingest';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

/** Parametri di stima dell'utente (ancore BSR) così l'estensione mostra gli stessi numeri della web app. */
export async function GET(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const anchors = await anchorsForUser(user.userId);
  return NextResponse.json({ anchors });
}
