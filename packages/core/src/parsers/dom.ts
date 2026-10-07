/** Helper minimi sul DOM: funzionano con il browser e con linkedom nei test. */

export type Root = Document | Element;

export function q(root: Root | null | undefined, selector: string): Element | null {
  return root ? root.querySelector(selector) : null;
}

export function qa(root: Root | null | undefined, selector: string): Element[] {
  return root ? Array.from(root.querySelectorAll(selector)) : [];
}

/** textContent normalizzato (spazi collassati, caratteri invisibili rimossi). */
export function text(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent ?? '')
    .replace(/[\u200e\u200f\u200b]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function attr(el: Element | null | undefined, name: string): string | null {
  const v = el?.getAttribute(name);
  return v == null || v === '' ? null : v;
}

/** Primo elemento che soddisfa uno dei selettori, in ordine. */
export function qFirst(root: Root | null | undefined, selectors: string[]): Element | null {
  for (const s of selectors) {
    const el = q(root, s);
    if (el) return el;
  }
  return null;
}

/** Rileva la locale della pagina dal tag html o da testi tipici. */
export function detectLocale(doc: Document): 'it' | 'en' | 'unknown' {
  const lang = (doc.documentElement?.getAttribute('lang') ?? '').toLowerCase();
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('en')) return 'en';
  const body = text(doc.body).slice(0, 5000).toLowerCase();
  if (/risultati|recensioni|aggiungi al carrello/.test(body)) return 'it';
  if (/results|reviews|add to basket|add to cart/.test(body)) return 'en';
  return 'unknown';
}
