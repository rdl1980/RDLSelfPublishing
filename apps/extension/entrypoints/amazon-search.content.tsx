import { parseSearchPage, parseSearchUrl, type SearchAlias } from '@rdl/core';
import ReactDOM from 'react-dom/client';
import '@/assets.css';
import { QuickViewApp } from '@/components/QuickViewApp';

const CARD_SELECTOR = 'div[data-component-type="s-search-result"][data-asin]';

/** Crea (una volta per card) un host con shadow root chiuso al CSS di Amazon e ritorna il contenitore interno. */
function ensureBadgeHost(card: Element): HTMLElement | null {
  const existing = card.querySelector('rdl-badge-host') as HTMLElement | null;
  if (existing?.shadowRoot) return existing.shadowRoot.firstElementChild as HTMLElement;
  const anchor = card.querySelector('[data-cy="title-recipe"]') ?? card.querySelector('h2')?.parentElement ?? null;
  if (!anchor) return null;
  const host = document.createElement('rdl-badge-host');
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  anchor.appendChild(host);
  return container;
}

export default defineContentScript({
  matches: ['https://www.amazon.it/s*', 'https://www.amazon.it/*/s*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    let root: ReactDOM.Root | null = null;

    const render = async () => {
      const { keyword, alias, page } = parseSearchUrl(location.href);
      const serp = parseSearchPage(document, { keyword, alias: alias as SearchAlias | null, page });
      if (serp.isBotChallenge) return;
      const rawCards = document.querySelectorAll(CARD_SELECTOR).length;
      if (!rawCards) return;

      const parsedWithData = serp.items.filter((i) => i.title && i.priceCents != null).length;
      const healthWarning =
        serp.items.length === 0 || parsedWithData / Math.max(1, serp.items.length) < 0.5
          ? 'Il layout di Amazon sembra cambiato: alcuni dati potrebbero mancare. Aggiorna l’estensione.'
          : null;

      const badgeHosts = new Map<string, HTMLElement>();
      for (const card of document.querySelectorAll(CARD_SELECTOR)) {
        const asin = card.getAttribute('data-asin');
        if (!asin || !serp.items.some((i) => i.asin === asin)) continue;
        const host = ensureBadgeHost(card);
        if (host) badgeHosts.set(asin, host);
      }

      const ui = await createShadowRootUi(ctx, {
        name: 'rdl-quick-view',
        position: 'inline',
        anchor: () => document.querySelector('div.s-main-slot') ?? document.querySelector('#search') ?? document.body,
        append: 'first',
        css: ':host { font-size: 16px; }',
        onMount(container) {
          root = ReactDOM.createRoot(container);
          root.render(<QuickViewApp serp={serp} badgeHosts={badgeHosts} healthWarning={healthWarning} />);
          return root;
        },
        onRemove(r) {
          r?.unmount();
          root = null;
        },
      });
      ui.mount();
      // Lo slot dei risultati è una griglia: il pannello deve occupare tutta la riga, non una cella.
      ui.shadowHost.style.gridColumn = '1 / -1';
      ui.shadowHost.style.width = '100%';
      ui.shadowHost.style.display = 'block';
    };

    await render();

    // Navigazione interna (paginazione via history): rimonta.
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      document.querySelectorAll('rdl-badge-host, rdl-quick-view').forEach((el) => el.remove());
      root?.unmount();
      root = null;
      setTimeout(() => void render(), 800);
    });
  },
});
