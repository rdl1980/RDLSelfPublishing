'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface RankPoint {
  date: string;
  [asin: string]: number | string | null;
}

const COLORS = ['#0f172a', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d'];

/** Posizione assoluta nel tempo (asse invertito: più in alto = posizione migliore). */
export function RankChart({ data, asins, maxPosition }: { data: RankPoint[]; asins: string[]; maxPosition: number }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis reversed domain={[1, maxPosition]} allowDecimals={false} width={40} />
          <Tooltip formatter={(v) => (v == null ? 'non trovato' : `pos. ${v}`)} />
          <Legend />
          {asins.map((a, i) => (
            <Line key={a} type="monotone" dataKey={a} stroke={COLORS[i % COLORS.length]} connectNulls={false} dot />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
