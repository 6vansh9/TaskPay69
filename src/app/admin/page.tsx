'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, Banknote, Clock, FileText,
  Users, Briefcase, AlertTriangle, ArrowLeftRight, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

interface Stats {
  totalUsers: number
  totalJobs: number
  activeContracts: number
  openDisputes: number
  totalDisputes: number
  pendingPayouts: number
  totalTransactions: number
  totalRevenue: number
  totalPaidOut: number
  chartData: { date: string; revenue: number }[]
}

type Range = 'daily' | 'weekly' | 'monthly'

function aggregate(data: { date: string; revenue: number }[], range: Range) {
  if (range === 'daily') return data

  if (range === 'weekly') {
    const out: { date: string; revenue: number }[] = []
    for (let i = 0; i < data.length; i += 7) {
      const slice = data.slice(i, i + 7)
      out.push({ date: `W${Math.floor(i / 7) + 1}`, revenue: slice.reduce((s, x) => s + x.revenue, 0) })
    }
    return out
  }

  // monthly
  const months: Record<string, number> = {}
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  data.forEach(({ date, revenue }) => {
    const m = parseInt(date.split('-')[0]) - 1
    const label = names[m] ?? date
    months[label] = (months[label] ?? 0) + revenue
  })
  return Object.entries(months).map(([date, revenue]) => ({ date, revenue }))
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('daily')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/stats')
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const chartData = stats ? aggregate(stats.chartData, range) : []

  const row1 = [
    { label: 'Platform Profit (10% fee)',  value: stats ? `₹${stats.totalRevenue.toLocaleString('en-IN')}` : null,  icon: TrendingUp,     color: 'text-[#14a800]',  bg: 'bg-[#14a800]/10'  },
    { label: 'Total Paid Out',    value: stats ? `₹${stats.totalPaidOut.toLocaleString('en-IN')}` : null,   icon: Banknote,       color: 'text-blue-400',   bg: 'bg-blue-950/30'   },
    { label: 'Pending Payouts',   value: stats?.pendingPayouts    ?? null,                                   icon: Clock,          color: 'text-orange-400', bg: 'bg-orange-950/30' },
    { label: 'Active Contracts',  value: stats?.activeContracts   ?? null,                                   icon: FileText,       color: 'text-purple-400', bg: 'bg-purple-950/30' },
  ]
  const row2 = [
    { label: 'Total Users',       value: stats?.totalUsers        ?? null, icon: Users,          color: 'text-cyan-400',   bg: 'bg-cyan-950/30'   },
    { label: 'Jobs Posted',       value: stats?.totalJobs         ?? null, icon: Briefcase,      color: 'text-yellow-400', bg: 'bg-yellow-950/30' },
    { label: 'Total Disputes',    value: stats?.totalDisputes     ?? null, icon: AlertTriangle,  color: 'text-red-400',    bg: 'bg-red-950/30'    },
    { label: 'Transactions',      value: stats?.totalTransactions ?? null, icon: ArrowLeftRight, color: 'text-[#14a800]',  bg: 'bg-[#14a800]/10'  },
  ]

  const StatCard = ({ label, value, icon: Icon, color, bg }: (typeof row1)[0]) => (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value === null
          ? <span className="skeleton h-7 w-16 inline-block rounded" />
          : value}
      </div>
    </div>
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-[var(--faint)] mt-0.5">Platform overview</p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-sm text-muted-foreground gap-1.5">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row1.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {row2.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Revenue Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Revenue Over Time</h2>
            <p className="text-xs text-[var(--faint)] mt-0.5">Platform fee earnings (last 30 days)</p>
          </div>
          <div className="flex gap-1 bg-background rounded-xl p-1">
            {(['daily', 'weekly', 'monthly'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                  range === r ? 'bg-muted text-foreground' : 'text-[var(--faint)] hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#2a2a2a"
              tick={{ fill: '#6b6b6b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#2a2a2a"
              tick={{ fill: '#6b6b6b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v === 0 ? '0' : `₹${v}`}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: '#a3a3a3', marginBottom: 4 }}
              itemStyle={{ color: '#4ade80' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#14a800"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#14a800', stroke: '#0a0a0a', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
