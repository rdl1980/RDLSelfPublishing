'use client';

import { useEffect, useState } from 'react';
import { Alert, Button } from '@/components/ui';

type Status = { connected: true; email: string | null } | { connected: false; error: string };

/** Rileva l'estensione (content script sulla web app) e le invia il token appena generato. */
export function ExtensionBridge({ token }: { token: string | null }) {
  const [version, setVersion] = useState<string | null>(null);
  const [result, setResult] = useState<Status | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // L'attributo può sparire dopo l'idratazione di React: non azzerare mai una versione già rilevata (anche via pong).
    const check = () => {
      const v = document.documentElement.dataset.rdlExtension;
      if (v) setVersion(v);
    };
    check();
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data as { source?: string; type?: string; version?: string; status?: Status } | undefined;
      if (!d || d.source !== 'rdl-ext') return;
      if (d.type === 'pong' && d.version) setVersion(d.version);
      if (d.type === 'connected' && d.status) {
        setResult(d.status);
        setSending(false);
      }
    };
    window.addEventListener('message', onMsg);
    const ping = () => window.postMessage({ source: 'rdl-web', type: 'ping' }, '*');
    ping();
    const id = setInterval(() => {
      check();
      ping();
    }, 2000);
    return () => {
      window.removeEventListener('message', onMsg);
      clearInterval(id);
    };
  }, []);

  function connect() {
    if (!token) return;
    setSending(true);
    setResult(null);
    window.postMessage({ source: 'rdl-web', type: 'connect', apiUrl: window.location.origin, token }, '*');
    setTimeout(() => setSending(false), 8000);
  }

  return (
    <div className="mt-3 space-y-2">
      {version ? (
        <p className="text-sm text-green-700">Estensione Chrome rilevata (v{version}).</p>
      ) : (
        <p className="text-sm text-slate-500">
          Estensione non rilevata in questo browser: caricala da chrome://extensions (cartella <code>apps/extension/.output/chrome-mv3</code>) e
          ricarica questa pagina.
        </p>
      )}
      {version && token && (
        <Button onClick={connect} disabled={sending}>
          {sending ? 'Collegamento…' : 'Collega l’estensione con questo token'}
        </Button>
      )}
      {result && (result.connected ? <Alert kind="success">Estensione collegata{result.email ? ` come ${result.email}` : ''}.</Alert> : <Alert kind="error">Collegamento fallito: {result.error}</Alert>)}
    </div>
  );
}
