import Link from 'next/link';
import { RoyaltyCalculator } from '@/components/calcolatori/RoyaltyCalculator';
import { PageTitle } from '@/components/ui';
import { parseProfileSettings } from '@/lib/settings';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function RoyaltyPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user!.id).maybeSingle();
  return (
    <>
      <PageTitle actions={<Link href="/calcolatori/bsr" className="text-sm underline">← Calcolatore BSR</Link>}>Calcolatore royalty KDP</PageTitle>
      <RoyaltyCalculator initialSettings={parseProfileSettings(profile?.settings)} />
    </>
  );
}
