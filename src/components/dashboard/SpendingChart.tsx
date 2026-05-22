'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface DataPoint { label: string; amount: number }

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">₹{payload[0].value.toLocaleString('en-IN')}</p>
    </div>
  )
}

export default function SpendingChart({ data }: { data: DataPoint[] }) {
  const max = Math.max(...data.map(d => d.amount), 1)

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Spending Overview</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.amount === max ? '#14a800' : '#14a800'} opacity={entry.amount === max ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
