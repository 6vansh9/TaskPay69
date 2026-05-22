'use client'

import { useEffect, useState } from 'react'

function formatPaidOut(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr+`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L+`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K+`
  if (n === 0)       return '₹0'
  return `₹${n.toLocaleString('en-IN')}+`
}

export default function LiveStats() {
  const [stats, setStats] = useState<{ freelancers: number; jobs: number; paid_out: number } | null>(null)

  useEffect(() => {
    fetch('/api/stats/public')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {})
  }, [])

  if (!stats) return null

  const items = [
    { value: stats.freelancers, label: 'Freelancers' },
    { value: stats.jobs,        label: 'Jobs Posted'  },
    { value: formatPaidOut(stats.paid_out), label: 'Paid Out', raw: true },
  ]

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap text-sm font-medium text-white/60">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className="text-[#14a800] font-bold text-base">
            {item.raw ? item.value : `${item.value}`}
          </span>
          <span>{item.label}</span>
          {i < items.length - 1 && <span className="text-white/20">·</span>}
        </span>
      ))}
    </div>
  )
}
