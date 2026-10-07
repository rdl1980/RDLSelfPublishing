import type { BsrAnchor, BsrStore, ParsedProduct, SearchResultItem } from '@rdl/core';
import type { CachedProduct } from './cache';
import type { ExtSettings } from './settings';

export type ConnectionStatus =
  | { connected: true; email: string | null; plan: string }
  | { connected: false; error: string };

export interface StatusReply {
  connection: ConnectionStatus;
  pausedUntil: number | null;
  activeJobs: number;
  activeJobId: string | null;
  pendingSync: number;
}

export interface ParsedProductLite {
  product: ParsedProduct['product'];
  snapshot: ParsedProduct['snapshot'];
}

export type Msg =
  | { type: 'status:get' }
  | { type: 'settings:get' }
  | { type: 'api:test-token' }
  | { type: 'config:get' }
  | { type: 'products:get'; asins: string[] }
  | { type: 'products:put'; items: ParsedProductLite[]; source: 'quick_view' | 'product_page' }
  | { type: 'cache:put'; items: ParsedProductLite[] }
  | { type: 'serp:ingest'; keyword: string; alias: string; page: number; items: SearchResultItem[]; totalResultsText: string | null; totalResultsEst: number | null }
  | { type: 'track:asin'; asin: string; label?: string }
  | { type: 'track:status'; asins: string[] }
  | { type: 'bot:challenge'; url: string }
  | { type: 'jobs:run-now' }
  | { type: 'jobs:pause'; minutes?: number }
  | { type: 'jobs:resume' }
  | { type: 'dev:save-fixture'; html: string; name: string };

export interface ConfigReply {
  anchors: Record<BsrStore, BsrAnchor[]>;
}

export type Reply<M extends Msg> = M extends { type: 'status:get' }
  ? StatusReply
  : M extends { type: 'settings:get' }
    ? ExtSettings
    : M extends { type: 'api:test-token' }
      ? ConnectionStatus
      : M extends { type: 'config:get' }
        ? ConfigReply
        : M extends { type: 'products:get' }
          ? { hits: Record<string, CachedProduct>; misses: string[] }
          : M extends { type: 'products:put' }
            ? { ok: true; synced: boolean }
            : M extends { type: 'cache:put' }
              ? { ok: true }
              : M extends { type: 'serp:ingest' }
                ? { ok: true; synced: boolean }
                : M extends { type: 'track:asin' }
                  ? { ok: boolean; error?: string }
                  : M extends { type: 'track:status' }
                    ? { tracked: string[] }
                    : M extends { type: 'bot:challenge' }
                      ? { pausedUntil: number }
                      : M extends { type: 'jobs:run-now' }
                        ? { started: boolean; executed?: number }
                        : M extends { type: 'jobs:pause' }
                          ? { pausedUntil: number }
                          : M extends { type: 'jobs:resume' }
                            ? { ok: true }
                            : M extends { type: 'dev:save-fixture' }
                              ? { ok: boolean }
                              : never;

export function sendMessage<M extends Msg>(msg: M): Promise<Reply<M>> {
  return chrome.runtime.sendMessage(msg) as Promise<Reply<M>>;
}
