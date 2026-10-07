'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';

export interface NicheListItem {
  id: string;
  name: string;
  notes: string | null;
  updatedAt: string;
  items: number;
}

export function NichesList({ niches }: { niches: NicheListItem[] }) {
  const user = useUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    const { data, error } = await createClient().from('niches').insert({ user_id: user.id, name: name.trim() }).select('id').single();
    if (error) return setError(error.message);
    setName('');
    router.push(`/nicchie/${data.id}`);
  }

  async function remove(id: string) {
    if (!confirm('Eliminare la nicchia e tutti i suoi elementi?')) return;
    await createClient().from('niches').delete().eq('id', id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={create} className="flex items-center gap-2">
          <Input className="w-80" placeholder="Nome della nuova nicchia" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!user || !name.trim()}>
            Crea nicchia
          </Button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </form>
      </Card>
      {niches.length ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {niches.map((n) => (
            <li key={n.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <div>
                <Link href={`/nicchie/${n.id}`} className="font-medium hover:underline">
                  {n.name}
                </Link>
                <span className="ml-2 text-slate-500">
                  {n.items} elementi · {new Date(n.updatedAt).toLocaleDateString('it-IT')}
                </span>
                {n.notes && <div className="text-xs text-slate-500">{n.notes.slice(0, 120)}</div>}
              </div>
              <Button variant="ghost" onClick={() => remove(n.id)}>
                Elimina
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Nessuna nicchia. Creane una e aggiungi keyword dalla ricerca.</p>
      )}
    </div>
  );
}
