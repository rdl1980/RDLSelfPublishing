import type { ExtSettings } from './settings';

export type ConnectionStatus =
  | { connected: true; email: string | null; plan: string }
  | { connected: false; error: string };

export interface StatusReply {
  connection: ConnectionStatus;
  pausedUntil: number | null;
  activeJobs: number;
}

export type Msg =
  | { type: 'status:get' }
  | { type: 'settings:get' }
  | { type: 'api:test-token' };

export type Reply<M extends Msg> = M extends { type: 'status:get' }
  ? StatusReply
  : M extends { type: 'settings:get' }
    ? ExtSettings
    : M extends { type: 'api:test-token' }
      ? ConnectionStatus
      : never;

export function sendMessage<M extends Msg>(msg: M): Promise<Reply<M>> {
  return chrome.runtime.sendMessage(msg) as Promise<Reply<M>>;
}
