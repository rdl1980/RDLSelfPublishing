import { useEffect, useState } from 'react';
import { sendMessage, type StatusReply } from '@/lib/messages';
import { getSettings } from '@/lib/settings';

export function App() {
  const [status, setStatus] = useState<StatusReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState('');

  const refresh = () => sendMessage({ type: 'status:get' }).then(setStatus, (e) => setError(String(e)));
  useEffect(() => {
    void getSettings().then((s) => setWebUrl(s.apiUrl.replace(/\/$/, '')));
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, []);

  async function runNow() {
    const r = await sendMessage({ type: 'jobs:run-now' });
    setNote(r.started ? 'Controllo la coda dei job…' : 'Un job è già in esecuzione');
    setTimeout(() => void refresh(), 1500);
  }
  async function togglePause() {
    if (status?.pausedUntil) await sendMessage({ type: 'jobs:resume' });
    else await sendMessage({ type: 'jobs:pause', minutes: 60 });
    void refresh();
  }
  async function saveFixture() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.includes('amazon.it')) return setNote('Apri una pagina amazon.it');
    const [res] = await chrome.scripting
      .executeScript({ target: { tabId: tab.id }, func: () => document.documentElement.outerHTML })
      .catch(() => [] as { result?: string }[]);
    const html = res?.result;
    if (!html) return setNote('Impossibile leggere la pagina');
    const name = new URL(tab.url).pathname.replace(/\W+/g, '-').slice(0, 40) + '-' + Date.now();
    const r = await sendMessage({ type: 'dev:save-fixture', html, name });
    setNote(r.ok ? 'Fixture salvata nei Download' : 'Errore nel salvataggio');
  }

  const btn = 'rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50';

  return (
    <div className="w-80 p-4 text-sm text-slate-800">
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
          {status.connection.connected && (status.connection.unreadAlerts ?? 0) > 0 && (
            <a href={`${webUrl}/avvisi`} target="_blank" rel="noreferrer" className="block rounded bg-amber-50 px-2 py-1 text-amber-800 hover:underline">
              {status.connection.unreadAlerts} {status.connection.unreadAlerts === 1 ? 'avviso non letto' : 'avvisi non letti'} ↗
            </a>
          )}
          {status.pausedUntil && (
            <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">In pausa fino alle {new Date(status.pausedUntil).toLocaleTimeString('it-IT')}</p>
          )}
          <p className="text-slate-500">
            {status.activeJobs ? `Job in esecuzione (${status.activeJobId?.slice(0, 8)}…)` : 'Nessun job in esecuzione'} · in coda di invio: {status.pendingSync}
          </p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className={btn} onClick={runNow} disabled={!status?.connection.connected || !!status?.pausedUntil}>
          Esegui ora
        </button>
        <button className={btn} onClick={togglePause}>
          {status?.pausedUntil ? 'Riprendi' : 'Pausa 1 ora'}
        </button>
        <button
          className={btn}
          disabled={!status?.connection.connected}
          onClick={async () => {
            await sendMessage({ type: 'tracking:run-now' });
            setNote('Tracking giornaliero avviato: i job compaiono nella web app');
          }}
        >
          Tracking ora
        </button>
        <button className={btn} onClick={() => chrome.runtime.openOptionsPage()}>
          Opzioni
        </button>
        <button className={btn} onClick={saveFixture} title="Salva l'HTML della pagina Amazon corrente per i test">
          Salva fixture
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
