import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();
  const { count } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).is('read_at', null);
  return (
    <AppShell email={user.email ?? null} unreadAlerts={count ?? 0}>
      {children}
    </AppShell>
  );
}
