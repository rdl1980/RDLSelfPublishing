import { NextResponse } from 'next/server';
import { unreadAlertsCount } from '@/lib/db/alerts';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

export async function GET(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const unreadAlerts = await unreadAlertsCount(user.userId).catch(() => 0);
  return NextResponse.json({ ...user, unreadAlerts });
}
