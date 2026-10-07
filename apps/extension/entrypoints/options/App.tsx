import { useEffect, useState } from 'react';
import { sendMessage, type ConnectionStatus } from '@/lib/messages';
import { DEFAULT_SETTINGS, getSettings, saveSettings, type ExtSettings } from '@/lib/settings';

export function App() {
  const [s, setS] = useState<ExtSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<ConnectionStatus | null>(null);

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    await saveSettings(s);
    setSaved(true);
    setTest(await sendMessage({ type: 'api:test-token' }));
    setTimeout(() => setSaved(false), 2000);
  }

  const field = 'mt-1 w-full rounded border border-slate-300 px-2 py-1';

  return (
    <div className="mx-auto max-w-lg p-6 text-sm text-slate-800">
      <h1 className="mb-4 text-lg font-semibold">Opzioni — RDL Self Publishing</h1>
      <form onSubmit={onSave} className="space-y-4">
        <label className="block">
          URL della web app
          <input
            className={field}
            value={s.apiUrl}
            onChange={(e) => setS({ ...s, apiUrl: e.target.value })}
            placeholder="http://localhost:3000"
          />
        </label>
        <label className="block">
          Token estensione
          <input
            className={field}
            type="password"
            value={s.apiToken}
            onChange={(e) => setS({ ...s, apiToken: e.target.value })}
            placeholder="rdl_…"
          />
        </label>
        <label className="block">
          Richieste simultanee verso amazon.it (1-3)
          <input
            className={field}
            type="number"
            min={1}
            max={3}
            value={s.concurrency}
            onChange={(e) => setS({ ...s, concurrency: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          Ora del tracking giornaliero (0-23)
          <input
            className={field}
            type="number"
            min={0}
            max={23}
            value={s.trackingHour}
            onChange={(e) => setS({ ...s, trackingHour: Number(e.target.value) })}
          />
        </label>
        <button className="rounded bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700" type="submit">
          Salva e verifica
        </button>
        {saved && <span className="ml-2 text-green-700">Salvato</span>}
      </form>
      {test && (
        <p className={`mt-4 rounded px-2 py-1 ${test.connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {test.connected ? `Connesso${test.email ? ` come ${test.email}` : ''}` : `Errore: ${test.error}`}
        </p>
      )}
      <p className="mt-6 text-xs text-slate-500">
        L'estensione legge solo le pagine di amazon.it che visiti o che richiedi tu, con limiti di
        velocità prudenti. Nessun dato viene inviato a terzi oltre alla tua web app.
      </p>
    </div>
  );
}
