'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Banknote, AlertTriangle, Users, BarChart3, Briefcase, TrendingUp, FileText } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalJobs: number
  activeContracts: number
  openDisputes: number
  pendingPayouts: number
  totalRevenue: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const cards = [
    { href: '/admin/withdrawals', icon: Banknote,       label: 'Pending Withdrawals', value: stats?.pendingPayouts,   color: 'text-green-600',  bg: 'bg-green-50' },
    { href: '/admin/disputes',    icon: AlertTriangle,  label: 'Open Disputes',       value: stats?.openDisputes,     color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { href: '/admin/users',       icon: Users,          label: 'Total Users',         value: stats?.totalUsers,        color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { href: '/jobs',              icon: Briefcase,      label: 'Total Jobs',          value: stats?.totalJobs,         color: 'text-blue-600',   bg: 'bg-blue-50' },
    { href: '/contracts',         icon: FileText,       label: 'Active Contracts',    value: stats?.activeContracts,   color: 'text-purple-600', bg: 'bg-purple-50' },
    { href: '#',                  icon: TrendingUp,     label: 'Platform Revenue',    value: stats ? `₹${stats.totalRevenue.toLocaleString()}` : null, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map(({ href, icon: Icon, label, value, color, bg }) => (
            <Link
              key={label}
              href={href}
              className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {value === null || value === undefined
                    ? <span className="skeleton h-7 w-12 inline-block rounded" />
                    : value}
                </div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
