import { useEffect, useState } from 'react';
import { sendMessage, type StatusReply } from '@/lib/messages';

export function App() {
  const [status, setStatus] = useState<StatusReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    sendMessage({ type: 'status:get' }).then(setStatus, (e) => setError(String(e)));
  }, []);

  async function saveFixture() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.includes('amazon.it')) return setSaved('Apri una pagina amazon.it');
    const [res] = await chrome.scripting
      .executeScript({ target: { tabId: tab.id }, func: () => document.documentElement.outerHTML })
      .catch(() => [] as { result?: string }[]);
    const html = res?.result;
    if (!html) return setSaved('Impossibile leggere la pagina (permesso mancante?)');
    const name = new URL(tab.url).pathname.replace(/\W+/g, '-').slice(0, 40) + '-' + Date.now();
    const r = await sendMessage({ type: 'dev:save-fixture', html, name });
    setSaved(r.ok ? 'Fixture salvata nei Download' : 'Errore nel salvataggio');
  }

  return (
    <div className="w-72 p-4 text-sm text-slate-800">
      <h1 className="mb-2 text-base font-semibold">RDL Self Publishing</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!status && !error && <p className="text-slate-500">Verifica connessione…</p>}
      {status && (
        <div className="space-y-2">
          {status.connection.connected ? (
            <p className="rounded bg-green-50 px-2 py-1 text-green-700">Connesso{status.connection.email ? ` come ${status.connection.email}` : ''}</p>
          ) : (
            <p className="rounded bg-red-50 px-2 py-1 text-red-700">Non connesso: {status.connection.error}</p>
          )}
          {status.pausedUntil && (
            <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
              In pausa (verifica anti-bot) fino alle {new Date(status.pausedUntil).toLocaleTimeString('it-IT')}
            </p>
          )}
          <p className="text-slate-500">
            Job attivi: {status.activeJobs} · in coda di invio: {status.pendingSync}
          </p>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={() => chrome.runtime.openOptionsPage()}>
          Opzioni
        </button>
        <button className="flex-1 rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={saveFixture} title="Salva l'HTML della pagina Amazon corrente per i test">
          Salva fixture
        </button>
      </div>
      {saved && <p className="mt-2 text-xs text-slate-500">{saved}</p>}
    </div>
  );
}
