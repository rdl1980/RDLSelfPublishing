export interface ExtSettings {
  apiUrl: string;
  apiToken: string;
  concurrency: number;
  productCacheTtlMs: number;
  trackingHour: number;
}

export const DEFAULT_SETTINGS: ExtSettings = {
  apiUrl: 'http://localhost:3000',
  apiToken: '',
  concurrency: 2,
  productCacheTtlMs: 24 * 60 * 60 * 1000,
  trackingHour: 8,
};

const KEY = 'settings';

export async function getSettings(): Promise<ExtSettings> {
  const stored = await chrome.storage.local.get(KEY);
  return { ...DEFAULT_SETTINGS, ...((stored[KEY] as Partial<ExtSettings> | undefined) ?? {}) };
}

export async function saveSettings(patch: Partial<ExtSettings>): Promise<ExtSettings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}
