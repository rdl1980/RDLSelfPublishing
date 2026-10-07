import { ProductPayloadSchema } from '@rdl/core';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ingestProducts } from '@/lib/db/ingest';
import { authenticateExtension, unauthorized } from '@/lib/ext-auth';

const Body = z.object({
  source: z.enum(['quick_view', 'product_page', 'manual']).default('quick_view'),
  products: z.array(ProductPayloadSchema).min(1).max(200),
});

export async function POST(req: Request) {
  const user = await authenticateExtension(req);
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Payload non valido', issues: parsed.error.issues }, { status: 400 });
  try {
    const result = await ingestProducts(user.userId, parsed.data.products, parsed.data.source);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
