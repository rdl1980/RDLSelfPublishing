'use client';

import { KDP_FIELD_MAX, suggestKdpKeywords, type WeightedPhrase } from '@rdl/core';
import { useMemo, useState } from 'react';
import { Button, Card, Input, Label } from '@/components/ui';

/**
 * Propone i 7 campi keyword KDP (max 50 caratteri) a partire da frasi pesate,
 * escludendo le parole già presenti in titolo, sottotitolo e autore.
 */
export function KdpKeywordsPanel({
  candidates,
  initialTitle = '',
  initialSubtitle = '',
}: {
  candidates: WeightedPhrase[];
  initialTitle?: string;
  initialSubtitle?: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [author, setAuthor] = useState('');
  const [exclude, setExclude] = useState('');
  const [copied, setCopied] = useState<number | 'all' | null>(null);

  const result = useMemo(
    () =>
      suggestKdpKeywords(candidates, {
        title,
        subtitle,
        author,
        excludeWords: exclude
          .split(/[,\n;]+/)
          .map((w) => w.trim())
          .filter(Boolean),
      }),
    [candidates, title, subtitle, author, exclude],
  );

  async function copy(text: string, which: number | 'all') {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">7 campi keyword KDP</h3>
      <p className="text-xs text-slate-500">
        Le parole già nel titolo, nel sottotitolo e nel nome autore vengono tolte (KDP le indicizza
        già), nessuna parola si ripete tra i campi, ogni campo resta entro {KDP_FIELD_MAX}{' '}
        caratteri. Controlla a mano che non ci siano nomi di altri autori o marchi: KDP li vieta.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Titolo</Label>
          <Input
            className="mt-1 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo del tuo libro"
          />
        </div>
        <div>
          <Label>Sottotitolo</Label>
          <Input
            className="mt-1 w-full"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Autore</Label>
          <Input
            className="mt-1 w-full"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div>
          <Label>Parole da escludere (virgole)</Label>
          <Input
            className="mt-1 w-full"
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            placeholder="es. moleskine, disney"
          />
        </div>
      </div>
      <ol className="space-y-1">
        {result.fields.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="w-5 text-right text-xs text-slate-400">{i + 1}</span>
            <code
              className={`grow rounded border px-2 py-1 font-mono text-xs ${f ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 text-slate-300'}`}
            >
              {f || 'vuoto'}
            </code>
            <span
              className={`w-12 text-right text-xs ${f.length > KDP_FIELD_MAX ? 'text-red-600' : 'text-slate-400'}`}
            >
              {f.length}/{KDP_FIELD_MAX}
            </span>
            <Button
              variant="ghost"
              className="py-0.5 text-xs"
              onClick={() => copy(f, i)}
              disabled={!f}
            >
              {copied === i ? 'copiato' : 'copia'}
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <Button
          variant="secondary"
          onClick={() => copy(result.fields.filter(Boolean).join('\n'), 'all')}
        >
          {copied === 'all' ? 'Copiati' : 'Copia tutti i campi'}
        </Button>
        <span>{result.coveredWords} parole coperte</span>
        {result.skippedTitleWords.length > 0 && (
          <span>già nel titolo: {result.skippedTitleWords.slice(0, 12).join(', ')}</span>
        )}
        {result.leftover.length > 0 && (
          <span>fuori per mancanza di spazio: {result.leftover.length} frasi</span>
        )}
      </div>
    </Card>
  );
}
