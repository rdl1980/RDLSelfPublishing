import { TokensPanel } from '@/components/impostazioni/TokensPanel';
import { Card, PageTitle } from '@/components/ui';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('id, label, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false });

  return (
    <>
      <PageTitle>Impostazioni</PageTitle>
      <div className="space-y-6">
        <Card>
          <h2 className="mb-1 text-base font-semibold">Account</h2>
          <p className="text-sm text-slate-600">
            {user?.email} · id utente <span className="font-mono text-xs">{user?.id}</span>
          </p>
        </Card>
        <TokensPanel tokens={tokens ?? []} />
        <Card>
          <h2 className="mb-1 text-base font-semibold">Parametri di stima</h2>
          <p className="text-sm text-slate-600">
            I fattori della curva BSR → vendite si regolano dal <a href="/calcolatori/bsr" className="underline">calcolatore BSR</a>. I costi di
            stampa KDP sono in configurazione interna e vanno verificati su kdp.amazon.com/help.
          </p>
        </Card>
      </div>
    </>
  );
}
