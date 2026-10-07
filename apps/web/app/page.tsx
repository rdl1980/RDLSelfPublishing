import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';

export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect('/login');
  return (
    <AppShell email={user.email ?? null} title="Dashboard">
      <p className="text-sm text-slate-600">
        Benvenuto. Da qui potrai avviare ricerche keyword, Deep View e tracking. Le sezioni arrivano con le fasi successive.
      </p>
    </AppShell>
  );
}
