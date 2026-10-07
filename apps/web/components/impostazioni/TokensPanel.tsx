'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';
import { ExtensionBridge } from './ExtensionBridge';

interface TokenRow {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function TokensPanel({ tokens }: { tokens: TokenRow[] }) {
  const user = useUser();
  const router = useRouter();
  const [label, setLabel] = useState('Estensione Chrome');
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!user) return;
    setError(null);
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = 'rdl_' + base64url(bytes);
    const token_hash = await sha256Hex(token);
    const { error } = await createClient().from('api_tokens').insert({ user_id: user.id, token_hash, label: label.trim() || null });
    if (error) return setError(error.message);
    setFresh(token);
    router.refresh();
  }

  async function revoke(id: string) {
    await createClient().from('api_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">Token per l&apos;estensione Chrome</h2>
      <p className="mb-3 text-sm text-slate-600">
        Genera un token e incollalo nelle Opzioni dell&apos;estensione insieme all&apos;URL di questa web app. Il token viene mostrato una sola volta.
      </p>
      <div className="mb-3 flex items-center gap-2">
        <Input className="w-64" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etichetta" />
        <Button onClick={generate} disabled={!user}>
          Genera token
        </Button>
      </div>
      {fresh && (
        <Alert kind="success">
          <div className="mb-1">Copia ora il token (non sarà più visibile):</div>
          <code className="block break-all rounded bg-white px-2 py-1 font-mono text-xs">{fresh}</code>
        </Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}
      <ExtensionBridge token={fresh} />
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {tokens.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-1.5">
            <span>
              {t.label ?? 'senza etichetta'} · creato {new Date(t.created_at).toLocaleDateString('it-IT')}
              {t.last_used_at && ` · ultimo uso ${new Date(t.last_used_at).toLocaleString('it-IT')}`}
              {t.revoked_at && <span className="ml-2 text-red-600">revocato</span>}
            </span>
            {!t.revoked_at && (
              <Button variant="ghost" onClick={() => revoke(t.id)}>
                Revoca
              </Button>
            )}
          </li>
        ))}
        {!tokens.length && <li className="py-2 text-slate-400">Nessun token</li>}
      </ul>
    </Card>
  );
}
