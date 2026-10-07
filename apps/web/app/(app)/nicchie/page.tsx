import { NichesList } from '@/components/nicchie/NichesList';
import { PageTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export default async function NichesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('niches')
    .select('id, name, notes, updated_at, niche_items(count)')
    .order('updated_at', { ascending: false });
  const niches = (data ?? []).map((n) => ({
    id: n.id,
    name: n.name,
    notes: n.notes,
    updatedAt: n.updated_at,
    items: (n.niche_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
  return (
    <>
      <PageTitle>Nicchie</PageTitle>
      <p className="mb-4 text-sm text-slate-600">Liste di keyword e ASIN con note: il tuo quaderno di lavoro per ogni idea di libro.</p>
      <NichesList niches={niches} />
    </>
  );
}
