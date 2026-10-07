import Link from 'next/link';
import { BsrCalculator } from '@/components/calcolatori/BsrCalculator';
import { PageTitle } from '@/components/ui';
import { parseProfileSettings } from '@/lib/settings';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function BsrPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user!.id).maybeSingle();
  return (
    <>
      <PageTitle actions={<Link href="/calcolatori/royalty" className="text-sm underline">Calcolatore royalty →</Link>}>
        Calcolatore BSR → vendite
      </PageTitle>
      <BsrCalculator initialSettings={parseProfileSettings(profile?.settings)} />
    </>
  );
}
