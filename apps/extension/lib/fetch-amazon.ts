import { BotChallengeError, isBotChallenge } from '@rdl/core';
import { sleep } from './throttle';

/**
 * Scarica una pagina di amazon.it dal contesto dell'utente (cookie inclusi) e la restituisce come Document.
 * Rileva la verifica anti-bot e applica un backoff su 429/503. Da usare solo in content script o offscreen
 * document (serve DOMParser).
 */
export async function fetchAmazonDocument(url: string, opts: { signal?: AbortSignal; retries?: number } = {}): Promise<Document> {
  const retries = opts.retries ?? 2;
  let attempt = 0;
  for (;;) {
    const res = await fetch(url, {
      credentials: 'include',
      signal: opts.signal,
      headers: { accept: 'text/html,application/xhtml+xml', 'accept-language': 'it-IT,it;q=0.9' },
    });
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      attempt++;
      await sleep(1500 * 2 ** attempt + Math.random() * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`amazon.it HTTP ${res.status} per ${url}`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (isBotChallenge(doc)) throw new BotChallengeError(url);
    return doc;
  }
}
