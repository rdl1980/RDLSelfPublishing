import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

/** Layout dei report stampabili: nessuna barra laterale, pagina bianca pronta per "Salva come PDF". */
export default async function ReportLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();
  if (!user) redirect('/login');
  return (
    <div className="mx-auto w-full max-w-5xl bg-white p-8 print:max-w-none print:p-0">
      {children}
    </div>
  );
}
