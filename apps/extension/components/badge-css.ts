/** CSS minimale per i badge nelle card dei risultati (shadow root manuale, senza Tailwind). */
export const BADGE_CSS = `
:host { all: initial; display: block; font: 12px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 6px 0 2px; }
.rdl { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
.rdl.loading { color: #64748b; font-style: italic; }
.rdl.error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.k { color: #64748b; }
.v { font-weight: 600; }
.tag { padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.tag.kdp { background: #dcfce7; color: #166534; }
.tag.pub { background: #e2e8f0; color: #334155; }
.tag.aplus { background: #fef3c7; color: #92400e; }
.tag.new { background: #dbeafe; color: #1e40af; }
.sales { color: #166534; }
`;
