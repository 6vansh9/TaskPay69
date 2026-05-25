'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Users, ArrowUpDown, Shield } from 'lucide-react'
import Header from '@/components/layout/Header'
import ProposalCard from '@/components/proposals/ProposalCard'
import { useProposals, type ProposalWithProfile } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab  = 'all' | 'shortlisted'
type Sort = 'best_match' | 'highest_rated' | 'lowest_price' | 'most_recent'

// ── Scoring helpers ───────────────────────────────────────────────

export function calcMatchScore(proposal: ProposalWithProfile, jobSkills: string[]): number {
  if (!jobSkills.length) return 0
  const fSkills = (proposal.profiles?.skills ?? []).map(s => s.toLowerCase())
  if (!fSkills.length) return 0
  const matched = jobSkills.filter(s => fSkills.includes(s.toLowerCase())).length
  return Math.round((matched / jobSkills.length) * 100)
}

function verifiedWeight(p: ProposalWithProfile): number {
  return Number(p.profiles?.phone_verified ?? false) + Number(p.profiles?.edu_verified ?? false)
}

function applySort(
  list: ProposalWithProfile[],
  sort: Sort,
  jobSkills: string[],
): ProposalWithProfile[] {
  return [...list].sort((a, b) => {
    let primary = 0
    if (sort === 'best_match') {
      primary = calcMatchScore(b, jobSkills) - calcMatchScore(a, jobSkills)
    } else if (sort === 'highest_rated') {
      primary = (b.profiles?.rating ?? 0) - (a.profiles?.rating ?? 0)
    } else if (sort === 'lowest_price') {
      primary = (a.bid_amount ?? 0) - (b.bid_amount ?? 0)
    } else {
      primary = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    // Verified freelancers break ties in every sort
    return primary !== 0 ? primary : verifiedWeight(b) - verifiedWeight(a)
  })
}

// ── Main component ────────────────────────────────────────────────

function ProposalsContent() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [tab, setTab]               = useState<Tab>('all')
  const [sort, setSort]             = useState<Sort>('best_match')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [jobTitle, setJobTitle]     = useState('')
  const [jobBudgetType, setBudgetType] = useState('fixed')
  const [jobSkills, setJobSkills]   = useState<string[]>([])
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/auth/login?next=/jobs/${jobId}/proposals`); return }
      const { data: job } = await supabase
        .from('jobs')
        .select('client_id, title, budget_type, skills, skills_required')
        .eq('id', jobId).single()
      if (!job || job.client_id !== user.id) {
        toast.error('Access denied'); router.push('/dashboard'); return
      }
      setJobTitle(job.title)
      setBudgetType(job.budget_type ?? 'fixed')
      setJobSkills((job.skills ?? job.skills_required ?? []) as string[])
      setAuthorized(true)
    })
  }, [jobId, router])

  const { data: proposals, isLoading } = useProposals(jobId)

  const processedProposals = useMemo(() => {
    if (!proposals) return []
    let list = tab === 'shortlisted'
      ? proposals.filter(p => p.is_shortlisted)
      : proposals
    if (verifiedOnly)
      list = list.filter(p => p.profiles?.phone_verified || p.profiles?.edu_verified)
    return applySort(list, sort, jobSkills)
  }, [proposals, tab, sort, verifiedOnly, jobSkills])

  if (authorized === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
    )
  }

  const totalCount      = proposals?.length ?? 0
  const shortlistedCount = (proposals ?? []).filter(p => p.is_shortlisted).length
  const verifiedCount   = (proposals ?? []).filter(p => p.profiles?.phone_verified || p.profiles?.edu_verified).length

  const SORT_OPTIONS: { value: Sort; label: string }[] = [
    { value: 'best_match',    label: 'Best Match'    },
    { value: 'highest_rated', label: 'Highest Rated' },
    { value: 'lowest_price',  label: 'Lowest Price'  },
    { value: 'most_recent',   label: 'Most Recent'   },
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

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="p-5 border-b border-border space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="font-bold text-foreground text-lg">Proposals</h1>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {isLoading ? '…' : (
                    <>
                      <span className="font-medium text-foreground">{totalCount}</span> total
                      {shortlistedCount > 0 && <> · <span className="text-[#14a800] font-medium">{shortlistedCount}</span> shortlisted</>}
                      {verifiedCount > 0 && <> · <span className="text-blue-400 font-medium">{verifiedCount}</span> verified</>}
                    </>
                  )}
                </p>
              </div>

              {/* Sort + Verified toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    className="input w-auto text-xs py-1.5"
                    value={sort}
                    onChange={e => setSort(e.target.value as Sort)}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setVerifiedOnly(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    verifiedOnly
                      ? 'bg-[#14a800]/10 border-[#14a800]/40 text-[#14a800]'
                      : 'border-border text-muted-foreground hover:border-[#14a800]/30 hover:text-foreground',
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Verified Only
                  {verifiedOnly && verifiedCount > 0 && (
                    <span className="font-bold">({verifiedCount})</span>
                  )}
                </button>
              </div>
            </div>

            {/* Skill chip row — only when best_match is active */}
            {sort === 'best_match' && jobSkills.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-muted-foreground">Matching skills:</span>
                {jobSkills.slice(0, 7).map(s => (
                  <span key={s} className="badge badge-gray text-[11px]">{s}</span>
                ))}
                {jobSkills.length > 7 && (
                  <span className="text-xs text-[var(--faint)]">+{jobSkills.length - 7} more</span>
                )}
              </div>
            )}

            {sort === 'best_match' && jobSkills.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground pt-1">
                No skills listed. Verified freelancers ranked first.
              </p>
            )}
          </div>

          {/* ── Tabs ───────────────────────────────────────────── */}
          <div className="tab-bar px-5">
            {([
              ['all',         'All',         null            ],
              ['shortlisted', 'Shortlisted', shortlistedCount],
            ] as [Tab, string, number | null][]).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn('tab', tab === value && 'tab-active')}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className="ml-1.5 bg-[#14a800]/20 text-[#14a800] text-[11px] font-bold rounded-full px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── List ───────────────────────────────────────────── */}
          <div className="p-4 flex flex-col gap-3">

            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="flex gap-4">
                  <div className="skeleton w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-40" />
                    <div className="skeleton h-4 w-64" />
                  </div>
                </div>
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
              </div>
            ))}

            {!isLoading && processedProposals.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">
                  {tab === 'shortlisted'
                    ? 'No shortlisted proposals yet'
                    : verifiedOnly
                    ? 'No verified proposals'
                    : 'No proposals yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tab === 'shortlisted'
                    ? 'Shortlist candidates to compare them here.'
                    : verifiedOnly
                    ? 'Turn off Verified Only to see all proposals.'
                    : 'Share your job post to attract freelancers.'}
                </p>
              </div>
            )}

            {!isLoading && processedProposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                jobId={jobId}
                jobBudgetType={jobBudgetType}
                matchScore={calcMatchScore(proposal, jobSkills)}
                isTopRated={(proposal.profiles?.rating ?? 0) >= 4.8 && (proposal.profiles?.review_count ?? 0) >= 3}
                onHired={contractId => router.push(`/contracts/${contractId}`)}
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
    }>
      <ProposalsContent />
    </Suspense>
  )
}
