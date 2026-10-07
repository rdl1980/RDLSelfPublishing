import {
  BotChallengeError,
  BSR_ANCHORS_IT,
  parseProductPage,
  productUrl,
  summarizeNiche,
  type BsrAnchor,
  type BsrStore,
  type SerpPage,
} from '@rdl/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CachedProduct } from '@/lib/cache';
import { fetchAmazonDocument } from '@/lib/fetch-amazon';
import { sendMessage } from '@/lib/messages';
import { DEFAULT_SETTINGS, type ExtSettings } from '@/lib/settings';
import { runPool } from '@/lib/throttle';
import { BADGE_CSS } from './badge-css';
import { QuickViewBadge, type BadgeState } from './QuickViewBadge';
import { QuickViewSummary } from './QuickViewSummary';

export interface QuickViewAppProps {
  serp: SerpPage;
  /** Contenitore (dentro uno shadow root) per il badge di ogni ASIN. */
  badgeHosts: Map<string, HTMLElement>;
  healthWarning: string | null;
}

export function QuickViewApp({ serp, badgeHosts, healthWarning }: QuickViewAppProps) {
  const [anchors, setAnchors] = useState<Record<BsrStore, BsrAnchor[]>>(BSR_ANCHORS_IT);
  const [settings, setSettings] = useState<ExtSettings>(DEFAULT_SETTINGS);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [states, setStates] = useState<Record<string, BadgeState>>(() =>
    Object.fromEntries(serp.items.map((i) => [i.asin, { status: 'loading' } as BadgeState])),
  );
  const [excludeSponsored, setExcludeSponsored] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'sending' | 'ok' | 'error' | 'queued'>('idle');
  const [warning, setWarning] = useState<string | null>(healthWarning);
  const started = useRef(false);

  const setState = useCallback((asin: string, st: BadgeState) => setStates((s) => ({ ...s, [asin]: st })), []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const [cfg, sett, status] = await Promise.all([
        sendMessage({ type: 'config:get' }).catch(() => null),
        sendMessage({ type: 'settings:get' }).catch(() => DEFAULT_SETTINGS),
        sendMessage({ type: 'status:get' }).catch(() => null),
      ]);
      if (cfg?.anchors) setAnchors(cfg.anchors);
      setSettings(sett);
      setConnected(status ? status.connection.connected : null);
      if (status?.pausedUntil) {
        setWarning(`Amazon ha mostrato una verifica anti-bot: le richieste automatiche sono in pausa fino alle ${new Date(status.pausedUntil).toLocaleTimeString('it-IT')}.`);
      }

      const asins = serp.items.map((i) => i.asin);
      const { hits, misses } = await sendMessage({ type: 'products:get', asins });
      for (const [asin, data] of Object.entries(hits)) setState(asin, { status: 'ok', data });
      if (!misses.length || status?.pausedUntil) {
        if (status?.pausedUntil) for (const a of misses) setState(a, { status: 'error', message: 'in pausa (anti-bot)' });
        return;
      }

      const fetched: { product: CachedProduct['product']; snapshot: CachedProduct['snapshot'] }[] = [];
      let bot = false;
      await runPool(
        misses,
        async (asin) => {
          const doc = await fetchAmazonDocument(productUrl(asin));
          const parsed = parseProductPage(doc, { asin });
          const data: CachedProduct = { product: parsed.product, snapshot: parsed.snapshot, fetchedAt: Date.now() };
          fetched.push({ product: parsed.product, snapshot: parsed.snapshot });
          setState(asin, { status: 'ok', data });
          if (fetched.length % 8 === 0) void sendMessage({ type: 'products:put', items: fetched.splice(0, fetched.length), source: 'quick_view' });
        },
        {
          concurrency: sett.concurrency,
          onEach: () => undefined,
          signal: undefined,
        },
      ).then(({ errors }) => {
        for (const { item, error } of errors) {
          if (error instanceof BotChallengeError) bot = true;
          setState(item, { status: 'error', message: error instanceof BotChallengeError ? 'verifica anti-bot' : 'dati non disponibili' });
        }
      });
      if (fetched.length) void sendMessage({ type: 'products:put', items: fetched, source: 'quick_view' });
      if (bot) {
        const r = await sendMessage({ type: 'bot:challenge', url: location.href });
        setWarning(`Amazon ha mostrato una verifica anti-bot: le richieste automatiche sono in pausa fino alle ${new Date(r.pausedUntil).toLocaleTimeString('it-IT')}. Apri una pagina Amazon e completa la verifica manualmente.`);
      }
    })().catch((e) => setWarning(`Errore: ${e instanceof Error ? e.message : String(e)}`));
  }, [serp, setState]);

  const enriched = useMemo(() => {
    const m = new Map<string, { snapshot: CachedProduct['snapshot']; product: CachedProduct['product'] }>();
    for (const [asin, st] of Object.entries(states)) if (st.status === 'ok') m.set(asin, { snapshot: st.data.snapshot, product: st.data.product });
    return m;
  }, [states]);

  const summary = useMemo(() => summarizeNiche(serp.items, enriched, { excludeSponsored, anchors }), [serp, enriched, excludeSponsored, anchors]);
  const loaded = enriched.size;

  const sync = async () => {
    setSyncState('sending');
    try {
      const r = await sendMessage({
        type: 'serp:ingest',
        keyword: serp.keyword ?? '',
        alias: serp.alias ?? 'stripbooks',
        page: serp.page,
        items: serp.items,
        totalResultsText: serp.totalResultsText,
        totalResultsEst: serp.totalResultsEst,
      });
      setSyncState(r.synced ? 'ok' : 'queued');
    } catch {
      setSyncState('error');
    }
  };

  return (
    <>
      <QuickViewSummary
        keyword={serp.keyword}
        summary={summary}
        loaded={loaded}
        total={serp.items.length}
        excludeSponsored={excludeSponsored}
        onToggleSponsored={() => setExcludeSponsored((v) => !v)}
        onSync={sync}
        syncState={syncState}
        connected={connected}
        warning={warning}
        webUrl={settings.apiUrl.replace(/\/$/, '')}
      />
      {serp.items.map((item) => {
        const host = badgeHosts.get(item.asin);
        if (!host) return null;
        return createPortal(
          <>
            <style>{BADGE_CSS}</style>
            <QuickViewBadge item={item} state={states[item.asin] ?? { status: 'loading' }} anchors={anchors} />
          </>,
          host,
          item.asin,
        );
      })}
    </>
  );
}
