import { sendMessage } from '@/lib/messages';
import { saveSettings } from '@/lib/settings';

/**
 * Ponte tra la web app e l'estensione: la pagina Impostazioni rileva l'estensione (attributo sul <html>)
 * e può inviarle URL e token con window.postMessage, senza copia-incolla manuale.
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

export default defineContentScript({
  matches: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*', 'https://*.vercel.app/*'],
  runAt: 'document_start',

  main() {
    document.documentElement.dataset.rdlExtension = chrome.runtime.getManifest().version;

    window.addEventListener('message', async (ev) => {
      if (ev.source !== window) return;
      const msg = ev.data as Partial<ConnectMsg> | Partial<PingMsg> | undefined;
      if (!msg || msg.source !== 'rdl-web') return;

      if (msg.type === 'ping') {
        window.postMessage({ source: 'rdl-ext', type: 'pong', version: chrome.runtime.getManifest().version }, '*');
        return;
      }
      if (msg.type === 'connect' && 'token' in msg && typeof msg.token === 'string' && typeof msg.apiUrl === 'string') {
        await saveSettings({ apiUrl: msg.apiUrl, apiToken: msg.token });
        const status = await sendMessage({ type: 'api:test-token' }).catch((e) => ({ connected: false as const, error: String(e) }));
        window.postMessage({ source: 'rdl-ext', type: 'connected', status }, '*');
        if (status.connected) void sendMessage({ type: 'jobs:run-now' }).catch(() => undefined);
      }
    });
  },
});
