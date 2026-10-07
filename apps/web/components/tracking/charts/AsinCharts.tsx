'use client';

import { formatEuroCents, formatIt } from '@rdl/core';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui';

export interface SnapshotPoint {
  date: string;
  bsr: number | null;
  price: number | null;
  reviews: number | null;
  rating: number | null;
  sales: number | null;
}

function Chart({ title, data, dataKey, fmt, log, reversed }: { title: string; data: SnapshotPoint[]; dataKey: keyof SnapshotPoint; fmt: (v: number) => string; log?: boolean; reversed?: boolean }) {
  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis scale={log ? 'log' : 'auto'} domain={['auto', 'auto']} reversed={reversed} width={60} fontSize={10} tickFormatter={(v) => fmt(Number(v))} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Line type="monotone" dataKey={dataKey} stroke="#0f172a" dot strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AsinCharts({ data }: { data: SnapshotPoint[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Chart title="BSR (asse invertito, scala log)" data={data} dataKey="bsr" fmt={(v) => formatIt(v)} log reversed />
      <Chart title="Vendite/giorno stimate" data={data} dataKey="sales" fmt={(v) => formatIt(v, 1)} />
      <Chart title="Prezzo" data={data} dataKey="price" fmt={(v) => formatEuroCents(v)} />
      <Chart title="Recensioni" data={data} dataKey="reviews" fmt={(v) => formatIt(v)} />
    </div>
  );
}
