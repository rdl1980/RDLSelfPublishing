'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { downloadText } from '@/lib/download';

export function ReportToolbar({
  backHref,
  jsonName,
  json,
}: {
  backHref: string;
  jsonName: string;
  json: unknown;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <Button onClick={() => window.print()}>Stampa / salva PDF</Button>
      <Button
        variant="secondary"
        onClick={() => downloadText(jsonName, JSON.stringify(json, null, 2), 'application/json')}
      >
        Scarica JSON
      </Button>
      <Link href={backHref} className="ml-auto text-sm underline">
        ← torna all&apos;app
      </Link>
    </div>
  );
}
