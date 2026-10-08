import { sendMessage } from '@/lib/messages';
import { getSettings, saveSettings } from '@/lib/settings';

/**
 * Ponte tra la web app e l'estensione: la pagina Impostazioni rileva l'estensione (attributo sul <html>)
 * e può inviarle URL e token con window.postMessage, senza copia-incolla manuale.
 *
 * Sicurezza: il content script gira su qualsiasi host *.vercel.app, quindi un sito terzo potrebbe
 * provare a sovrascrivere URL e token. Per questo:
 * - l'URL accettato è SOLO l'origine della pagina che invia il messaggio (non si può dirottare
 *   l'estensione verso un altro server);
 * - se l'origine è diversa da quella già configurata, l'utente deve confermare con una finestra
 *   nativa del browser che la pagina non può falsificare;
 * - le risposte vengono inviate solo all'origine della pagina, mai con '*'.
 */
interface ConnectMsg {
  source: 'rdl-web';
  type: 'connect';
  apiUrl: string;
  token: string;
}
interface PingMsg {
  source: 'rdl-web';
  type: 'ping';
}

const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function normalizeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export default defineContentScript({
  matches: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*', 'https://*.vercel.app/*'],
  runAt: 'document_start',

  main() {
    const pageOrigin = location.origin;
    const reply = (data: unknown) => window.postMessage(data, pageOrigin);

    // Segnala la presenza dell'estensione solo alle pagine che possono essere la web app
    // (host locali o quello già configurato): un sito qualsiasi su vercel.app non la vede.
    void getSettings().then((s) => {
      const configured = normalizeOrigin(s.apiUrl);
      if (LOCAL_ORIGINS.includes(pageOrigin) || configured === pageOrigin || !s.apiToken) {
        document.documentElement.dataset.rdlExtension = chrome.runtime.getManifest().version;
      }
    });

    window.addEventListener('message', async (ev) => {
      if (ev.source !== window || ev.origin !== pageOrigin) return;
      const msg = ev.data as Partial<ConnectMsg> | Partial<PingMsg> | undefined;
      if (!msg || msg.source !== 'rdl-web') return;

      if (msg.type === 'ping') {
        reply({ source: 'rdl-ext', type: 'pong', version: chrome.runtime.getManifest().version });
        return;
      }
      if (msg.type === 'connect' && 'token' in msg && typeof msg.token === 'string' && typeof msg.apiUrl === 'string') {
        if (!/^rdl_[A-Za-z0-9_-]{20,}$/.test(msg.token)) {
          reply({ source: 'rdl-ext', type: 'connected', status: { connected: false, error: 'Token non valido' } });
          return;
        }
        // L'URL della web app deve coincidere con l'origine della pagina: nessun dirottamento possibile.
        const requested = normalizeOrigin(msg.apiUrl);
        if (!requested || requested !== pageOrigin) {
          reply({ source: 'rdl-ext', type: 'connected', status: { connected: false, error: `URL non consentito: ${msg.apiUrl}` } });
          return;
        }
        const current = await getSettings();
        const alreadyConfigured = normalizeOrigin(current.apiUrl) === pageOrigin && !!current.apiToken;
        if (!alreadyConfigured && !LOCAL_ORIGINS.includes(pageOrigin)) {
          const ok = window.confirm(
            `RDL Self Publishing: collegare l'estensione alla web app ${pageOrigin}?\n\nConferma solo se questa è la tua web app.`,
          );
          if (!ok) {
            reply({ source: 'rdl-ext', type: 'connected', status: { connected: false, error: 'Collegamento annullato dall’utente' } });
            return;
          }
        }
        await saveSettings({ apiUrl: pageOrigin, apiToken: msg.token });
        document.documentElement.dataset.rdlExtension = chrome.runtime.getManifest().version;
        const status = await sendMessage({ type: 'api:test-token' }).catch((e) => ({ connected: false as const, error: String(e) }));
        reply({ source: 'rdl-ext', type: 'connected', status });
        if (status.connected) void sendMessage({ type: 'jobs:run-now' }).catch(() => undefined);
      }
    });
  },
});
