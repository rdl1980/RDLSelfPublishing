import { q, qa, text } from './dom';

/** Contenuto testuale dell'inserzione: descrizione, bullet, recensioni editoriali, moduli A+. */
export interface ListingContent {
  description: string | null;
  bullets: string[];
  editorialReviews: string | null;
  aplusModules: number | null;
  /** Lunghezza del testo A+ (immagini escluse). */
  aplusTextLength: number;
}

const MAX_DESCRIPTION = 6000;

function blockText(el: Element | null): string | null {
  if (!el) return null;
  // Spazi tra i paragrafi: i <p>/<br> diventano "a capo" prima di collassare gli spazi.
  const html = (el as HTMLElement).innerHTML ?? '';
  const withBreaks = html.replace(/<\/(p|h\d|li|div)>|<br\s*\/?>/gi, '\n');
  const tmp = el.ownerDocument?.createElement('div');
  if (!tmp) return text(el) || null;
  tmp.innerHTML = withBreaks;
  const t = (tmp.textContent ?? '')
    .replace(/[\u200e\u200f\u200b]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  return t ? t.slice(0, MAX_DESCRIPTION) : null;
}

export function parseListing(doc: Document): ListingContent {
  const description = blockText(
    q(doc, '#bookDescription_feature_div .a-expander-content') ??
      q(doc, '#bookDescription_feature_div') ??
      q(doc, '#productDescription') ??
      q(doc, '#productDescription_feature_div'),
  );
  const bullets = qa(doc, '#feature-bullets li span.a-list-item, #feature-bullets li')
    .map((li) => text(li))
    .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i)
    .slice(0, 10);
  const editorialReviews = blockText(
    q(doc, '#editorialReviews_feature_div .a-expander-content') ??
      q(doc, '#editorialReviews_feature_div'),
  );
  const aplusRoot = q(doc, '#aplus_feature_div') ?? q(doc, '#aplus');
  const modules = aplusRoot ? qa(aplusRoot, '.aplus-module') : [];
  const aplusText = aplusRoot ? text(aplusRoot) : '';
  return {
    description,
    bullets,
    editorialReviews,
    aplusModules: aplusRoot ? modules.length : null,
    aplusTextLength: aplusText.length,
  };
}
