import { NextResponse } from 'next/server';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

export async function GET(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  return NextResponse.json(user);
}
