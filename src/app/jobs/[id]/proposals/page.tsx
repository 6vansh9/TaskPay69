'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Users, ArrowUpDown } from 'lucide-react'
import Header from '@/components/layout/Header'
import ProposalCard from '@/components/proposals/ProposalCard'
import { useProposals } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab = 'all' | 'shortlisted' | 'verified'
type Sort = 'created_at' | 'bid_amount_asc' | 'bid_amount_desc'

function ProposalsContent() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<Sort>('created_at')
  const [jobTitle, setJobTitle] = useState('')
  const [jobBudgetType, setJobBudgetType] = useState('fixed')
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/auth/login?next=/jobs/${jobId}/proposals`); return }
      const { data: job } = await supabase.from('jobs').select('client_id, title, budget_type').eq('id', jobId).single()
      if (!job || job.client_id !== user.id) { toast.error('Access denied'); router.push('/dashboard'); return }
      setJobTitle(job.title)
      setJobBudgetType(job.budget_type ?? 'fixed')
      setAuthorized(true)
    })
  }, [jobId, router])

  const { data: proposals, isLoading } = useProposals(jobId)

  if (authorized === null) {
    return <div className="flex-1 flex items-center justify-center"><div className="skeleton w-8 h-8 rounded-full" /></div>
  }

  const filtered = (proposals ?? []).filter(p => {
    if (tab === 'shortlisted') return p.is_shortlisted
    if (tab === 'verified') return p.profiles?.phone_verified || p.profiles?.edu_verified
    return true
  })
  const shortlistedCount = (proposals ?? []).filter(p => p.is_shortlisted).length
  const verifiedCount = (proposals ?? []).filter(p => p.profiles?.phone_verified || p.profiles?.edu_verified).length

  const SORT_OPTIONS: { value: Sort; label: string }[] = [
    { value: 'created_at',      label: 'Newest first' },
    { value: 'bid_amount_asc',  label: 'Price: Low → High' },
    { value: 'bid_amount_desc', label: 'Price: High → Low' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
          <Link href="/dashboard" className="hover:text-[#14a800]">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/jobs/${jobId}`} className="hover:text-[#14a800] truncate max-w-xs">{jobTitle}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">Proposals</span>
        </nav>

        <div className="card">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-bold text-foreground text-lg">Proposals</h1>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {isLoading ? '…' : `${proposals?.length ?? 0} total · ${shortlistedCount} shortlisted`}
              </p>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                className="input w-auto text-xs py-1.5"
                value={sort}
                onChange={e => setSort(e.target.value as Sort)}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="tab-bar px-5">
            {([
              ['all', 'All', null],
              ['shortlisted', 'Shortlisted', shortlistedCount],
              ['verified', 'Verified Only', verifiedCount],
            ] as [Tab, string, number | null][]).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn('tab', tab === value && 'tab-active')}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className="ml-1.5 bg-[#14a800/20] text-[#14a800] text-[11px] font-bold rounded-full px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="p-4 flex flex-col gap-3">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="flex gap-4"><div className="skeleton w-12 h-12 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-40" /><div className="skeleton h-4 w-64" /></div></div>
                <div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-5/6" />
              </div>
            ))}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">
                  {tab === 'shortlisted' ? 'No shortlisted proposals yet' : 'No proposals yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tab === 'shortlisted' ? 'Shortlist candidates to compare them here.' : 'Share your job post to attract freelancers.'}
                </p>
              </div>
            )}

            {!isLoading && filtered.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                jobId={jobId}
                jobBudgetType={jobBudgetType}
                onHired={(contractId) => router.push(`/contracts/${contractId}`)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="skeleton w-8 h-8 rounded-full" /></div>}>
      <ProposalsContent />
    </Suspense>
  )
}
