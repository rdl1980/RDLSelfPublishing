import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageTitle } from '@/components/ui';

export default async function HomePage() {
  const supabase = await createClient();
  const [{ count: sessions }, { count: niches }, { count: trackedKw }, { count: trackedAsins }, { data: recent }] =
    await Promise.all([
      supabase.from('research_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('niches').select('id', { count: 'exact', head: true }),
      supabase.from('tracked_keywords').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('tracked_asins').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('research_sessions').select('id, name, seed, created_at, stats').order('created_at', { ascending: false }).limit(5),
    ]);

  const cards = [
    { label: 'Sessioni keyword', value: sessions ?? 0, href: '/keyword' },
    { label: 'Nicchie salvate', value: niches ?? 0, href: '/nicchie' },
    { label: 'Keyword tracciate', value: trackedKw ?? 0, href: '/tracking/keyword' },
    { label: 'ASIN tracciati', value: trackedAsins ?? 0, href: '/tracking/asin' },
  ];

  return (
    <>
      <PageTitle>Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
            <div className="text-2xl font-semibold">{c.value}</div>
            <div className="text-sm text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-lg font-semibold">Ultime ricerche keyword</h2>
      {recent && recent.length > 0 ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {recent.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <Link href={`/keyword/sessioni/${s.id}`} className="font-medium hover:underline">
                {s.name}
              </Link>
              <span className="text-slate-500">
                seme «{s.seed}» · {(s.stats as { suggestions?: number } | null)?.suggestions ?? 0} suggerimenti ·{' '}
                {new Date(s.created_at).toLocaleDateString('it-IT')}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          Nessuna ricerca ancora. <Link href="/keyword" className="underline">Inizia dalla ricerca keyword</Link>.
        </p>
      )}
    </>
  );
}
