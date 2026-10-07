import { useEffect, useState } from 'react';
import { sendMessage, type StatusReply } from '@/lib/messages';

export function App() {
  const [status, setStatus] = useState<StatusReply | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sendMessage({ type: 'status:get' }).then(setStatus, (e) => setError(String(e)));
  }, []);

  return (
    <div className="w-72 p-4 text-sm text-slate-800">
      <h1 className="mb-2 text-base font-semibold">RDL Self Publishing</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!status && !error && <p className="text-slate-500">Verifica connessione…</p>}
      {status && (
        <div className="space-y-2">
          {status.connection.connected ? (
            <p className="rounded bg-green-50 px-2 py-1 text-green-700">
              Connesso{status.connection.email ? ` come ${status.connection.email}` : ''}
            </p>
          ) : (
            <p className="rounded bg-red-50 px-2 py-1 text-red-700">
              Non connesso: {status.connection.error}
            </p>
          )}
          <p className="text-slate-500">Job attivi: {status.activeJobs}</p>
        </div>
      )}
      <button
        className="mt-3 w-full rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Opzioni
      </button>
    </div>
  );
}
