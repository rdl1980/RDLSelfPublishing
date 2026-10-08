'use client';

import { formatEuroCents, formatIt } from '@rdl/core';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui';

export interface KeywordTrendPoint {
  date: string;
  results: number | null;
  sales: number | null;
  price: number | null;
  reviews: number | null;
  newShare: number | null;
}

function Chart({
  title,
  data,
  dataKey,
  fmt,
  hint,
}: {
  title: string;
  data: KeywordTrendPoint[];
  dataKey: keyof KeywordTrendPoint;
  fmt: (v: number) => string;
  hint?: string;
}) {
  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {hint && <p className="mb-1 text-xs text-slate-400">{hint}</p>}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis
              domain={['auto', 'auto']}
              width={60}
              fontSize={10}
              tickFormatter={(v) => fmt(Number(v))}
            />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#0f172a"
              dot
              strokeWidth={2}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Stagionalità di una keyword: andamento giornaliero di risultati, vendite stimate, prezzo e recensioni. */
export function KeywordTrendChart({ data }: { data: KeywordTrendPoint[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Chart
        title="Risultati totali"
        data={data}
        dataKey="results"
        fmt={(v) => formatIt(v)}
        hint="quanti libri Amazon dichiara per la ricerca: cresce quando entrano nuovi concorrenti"
      />
      <Chart
        title="Vendite/mese stimate dei top 10"
        data={data}
        dataKey="sales"
        fmt={(v) => formatIt(v)}
        hint="domanda della nicchia: sale nei periodi di stagione"
      />
      <Chart title="Prezzo mediano" data={data} dataKey="price" fmt={(v) => formatEuroCents(v)} />
      <Chart title="Recensioni mediane" data={data} dataKey="reviews" fmt={(v) => formatIt(v)} />
    </div>
  );
}
