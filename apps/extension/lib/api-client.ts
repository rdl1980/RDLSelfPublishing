import { getSettings } from './settings';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiUrl, apiToken } = await getSettings();
  if (!apiToken) throw new ApiError(401, 'Token mancante: configuralo nelle Opzioni');
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiToken}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* corpo non JSON */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

export interface MeResponse {
  userId: string;
  email: string | null;
  plan: string;
}

export const api = {
  me: () => apiFetch<MeResponse>('/api/ext/me'),
};
