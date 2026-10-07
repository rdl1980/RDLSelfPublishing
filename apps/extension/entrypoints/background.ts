import { api, ApiError } from '@/lib/api-client';
import type { ConnectionStatus, Msg, Reply } from '@/lib/messages';
import { getSettings } from '@/lib/settings';

async function testConnection(): Promise<ConnectionStatus> {
  try {
    const me = await api.me();
    return { connected: true, email: me.email, plan: me.plan };
  } catch (e) {
    const error = e instanceof ApiError ? `${e.status}: ${e.message}` : String(e);
    return { connected: false, error };
  }
}

async function handle<M extends Msg>(msg: M): Promise<Reply<M>> {
  switch (msg.type) {
    case 'status:get':
      return {
        connection: await testConnection(),
        pausedUntil: null,
        activeJobs: 0,
      } as Reply<M>;
    case 'settings:get':
      return (await getSettings()) as Reply<M>;
    case 'api:test-token':
      return (await testConnection()) as Reply<M>;
  }
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
    handle(msg).then(sendResponse, (err) => sendResponse({ error: String(err) }));
    return true;
  });
});
