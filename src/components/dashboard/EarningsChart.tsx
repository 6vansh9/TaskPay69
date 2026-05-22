'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

interface DataPoint { label: string; amount: number }

interface Props {
  weekly: DataPoint[]
  monthly: DataPoint[]
}

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

export default function EarningsChart({ weekly, monthly }: Props) {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly')
  const data = view === 'weekly' ? weekly : monthly

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Earnings</h2>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(['weekly', 'monthly'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                view === v
                  ? 'bg-[#14a800] text-white font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14a800" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#14a800" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="amount" stroke="#14a800" strokeWidth={2} fill="url(#earningsGrad)" dot={false} activeDot={{ r: 4, fill: '#14a800' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
