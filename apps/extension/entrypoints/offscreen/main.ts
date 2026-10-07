import type { Job } from '@rdl/core';
import { runChunk } from '@/lib/job-runner';
import type { ExtSettings } from '@/lib/settings';

/**
 * Offscreen document: ha fetch + DOMParser, quindi esegue i chunk dei job che il service worker
 * gli manda. Non persiste nulla: il risultato torna al service worker che lo invia alla web app.
 */
interface RunChunkMsg {
  target: 'offscreen';
  type: 'job:run-chunk';
  job: Job;
  settings: ExtSettings;
}

chrome.runtime.onMessage.addListener((msg: Partial<RunChunkMsg>, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;
  if (msg.type === 'job:run-chunk' && msg.job && msg.settings) {
    runChunk(msg.job, msg.settings).then(sendResponse, (e) => sendResponse({ ok: false, error: String(e), bot: false }));
    return true;
  }
  if (msg.type === ('ping' as string)) {
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
