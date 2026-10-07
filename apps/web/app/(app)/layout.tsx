import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();
  if (!user) redirect('/login');
  return <AppShell email={user.email ?? null}>{children}</AppShell>;
}
