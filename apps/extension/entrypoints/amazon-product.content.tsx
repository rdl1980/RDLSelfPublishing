import { extractAsin, parseProductPage } from '@rdl/core';
import ReactDOM from 'react-dom/client';
import '@/assets.css';
import { ProductPanel } from '@/components/ProductPanel';

export default defineContentScript({
  matches: ['https://www.amazon.it/dp/*', 'https://www.amazon.it/*/dp/*', 'https://www.amazon.it/gp/product/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    const asin = extractAsin(location.href);
    const parsed = parseProductPage(document, { asin });
    if (parsed.isBotChallenge || !parsed.product.title) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'rdl-product-panel',
      position: 'inline',
      anchor: () => document.querySelector('#rightCol') ?? document.querySelector('#centerCol') ?? document.querySelector('#dp-container') ?? document.body,
      append: 'first',
      css: ':host { font-size: 16px; display: block; }',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<ProductPanel parsed={parsed} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
