'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { Briefcase, CheckCircle2, Clock, AlertCircle, XCircle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContractProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  company_name?: string | null
  title?: string | null
  rating?: number
}

interface ContractData {
  id: string
  client_id: string | null
  freelancer_id: string | null
  amount: number | null
  status: string
  created_at: string
  job: { id: string; title: string; category: string | null } | null
  client: ContractProfile | null
  freelancer: ContractProfile | null
}

const STATUS_STYLES: Record<string, { label: string; icon: typeof CheckCircle2; color: string; badge: string }> = {
  active: { label: 'Active', icon: Clock, color: 'text-[#14a800]', badge: 'badge-green' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-blue-500', badge: 'badge-blue' },
  complete: { label: 'Complete', icon: CheckCircle2, color: 'text-[#14a800]', badge: 'badge-green' },
  disputed: { label: 'Disputed', icon: AlertCircle, color: 'text-red-500', badge: 'badge-red' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-[#6b6b6b]', badge: 'badge-gray' },
}

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login?next=/contracts'); return }
      setUserId(user.id)
      fetch('/api/contracts')
        .then(r => r.json())
        .then((data: ContractData[]) => { setContracts(data); setLoading(false) })
    })
  }, [router])

  const statuses = ['all', 'active', 'delivered', 'complete', 'cancelled']
  const filtered = filter === 'all' ? contracts : contracts.filter(c => c.status === filter)

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f7]">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1d1d1d]">My Contracts</h1>
          <Link href="/jobs" className="btn btn-primary btn-sm">Find Work</Link>
        </div>

        {/* Status filters */}
        <div className="tab-bar mb-4">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn('tab capitalize', filter === s && 'tab-active')}
            >
              {s === 'all' ? 'All' : STATUS_STYLES[s]?.label ?? s}
              {s !== 'all' && (
                <span className="ml-1 text-xs text-[#6b6b6b]">
                  ({contracts.filter(c => c.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="card p-12 text-center">
            <Briefcase className="w-10 h-10 text-[#6b6b6b] mx-auto mb-3" />
            <p className="font-medium text-[#1d1d1d]">No contracts {filter !== 'all' ? `with status "${STATUS_STYLES[filter]?.label}"` : 'yet'}</p>
            <p className="text-sm text-[#6b6b6b] mt-1">Hire a freelancer or submit a proposal to get started.</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(contract => {
            const isClient = userId === contract.client_id
            const other = isClient ? contract.freelancer : contract.client
            const cfg = STATUS_STYLES[contract.status] ?? STATUS_STYLES.active
            const StatusIcon = cfg.icon

            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer block"
              >
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#e2f0d9] flex items-center justify-center text-sm font-bold text-[#14a800] flex-shrink-0">
                    {(other?.company_name ?? other?.full_name ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('badge', cfg.badge, 'flex items-center gap-1')}>
                      <StatusIcon className="w-3 h-3" />{cfg.label}
                    </span>
                    {contract.job?.category && <span className="badge badge-gray">{contract.job.category}</span>}
                  </div>
                  <div className="font-medium text-[#1d1d1d] mt-1 truncate">{contract.job?.title ?? 'Contract'}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[#6b6b6b]">
                    <span>with {other?.company_name ?? other?.full_name}</span>
                    {other?.rating != null && other.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />{other.rating.toFixed(1)}
                      </span>
                    )}
                    <span>{timeAgo(contract.created_at)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-[#14a800]">{formatCurrency(contract.amount ?? 0)}</div>
                  <div className="text-xs text-[#6b6b6b]">{isClient ? 'You hired' : 'You work'}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}
