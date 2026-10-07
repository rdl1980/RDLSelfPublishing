import { notFound } from 'next/navigation';
import { NicheDetail } from '@/components/nicchie/NicheDetail';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function NichePage({ params }: PageProps<'/nicchie/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: niche }, { data: items }] = await Promise.all([
    supabase.from('niches').select('*').eq('id', id).maybeSingle(),
    supabase.from('niche_items').select('id, kind, asin, note, created_at, keyword:keywords(text)').eq('niche_id', id).order('created_at'),
  ]);
  if (!niche) notFound();

  const asins = (items ?? []).filter((i) => i.kind === 'asin' && i.asin).map((i) => i.asin!);
  const { data: products } = asins.length
    ? await supabase.from('products').select('asin, title, is_independent, page_count, pub_date, image_url').in('asin', asins)
    : { data: [] };

  return (
    <>
      <PageTitle>{niche.name}</PageTitle>
      <NicheDetail
        niche={{ id: niche.id, name: niche.name, notes: niche.notes }}
        items={(items ?? []).map((i) => ({
          id: i.id,
          kind: i.kind as 'keyword' | 'asin',
          asin: i.asin,
          note: i.note,
          keyword: (i.keyword as unknown as { text: string } | null)?.text ?? null,
        }))}
        products={products ?? []}
      />
    </>
  );
}
