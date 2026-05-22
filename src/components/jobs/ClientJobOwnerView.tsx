'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, ArrowUpDown, Shield, Eye, Clock, BarChart2,
  Pencil, XCircle, CheckCircle, ChevronDown, ChevronUp,
  Loader2,
} from 'lucide-react'
import { useProposals, type ProposalWithProfile } from '@/lib/hooks'
import ProposalCard from '@/components/proposals/ProposalCard'
import { cn, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab  = 'all' | 'shortlisted'
type Sort = 'best_match' | 'highest_rated' | 'lowest_price' | 'most_recent'

function calcMatchScore(proposal: ProposalWithProfile, jobSkills: string[]): number {
  if (!jobSkills.length) return 0
  const fSkills = (proposal.profiles?.skills ?? []).map(s => s.toLowerCase())
  return Math.round(
    (jobSkills.filter(s => fSkills.includes(s.toLowerCase())).length / jobSkills.length) * 100
  )
}

function applySort(list: ProposalWithProfile[], sort: Sort, jobSkills: string[]): ProposalWithProfile[] {
  return [...list].sort((a, b) => {
    let p = 0
    if (sort === 'best_match')    p = calcMatchScore(b, jobSkills) - calcMatchScore(a, jobSkills)
    else if (sort === 'highest_rated') p = (b.profiles?.rating ?? 0) - (a.profiles?.rating ?? 0)
    else if (sort === 'lowest_price')  p = (a.bid_amount ?? 0) - (b.bid_amount ?? 0)
    else p = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    const verifiedW = (x: ProposalWithProfile) =>
      Number(x.profiles?.phone_verified ?? 0) + Number(x.profiles?.edu_verified ?? 0)
    return p !== 0 ? p : verifiedW(b) - verifiedW(a)
  })
}

interface Job {
  id: string
  title: string
  status: string
  budget_type: string
  skills: string[] | null
  proposals_count: number
  bid_count: number
  created_at: string
}

interface Props {
  job: Job
}

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'best_match',    label: 'Best Match'    },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'lowest_price',  label: 'Lowest Price'  },
  { value: 'most_recent',   label: 'Most Recent'   },
]

export default function ClientJobOwnerView({ job }: Props) {
  const router = useRouter()
  const [tab, setTab]               = useState<Tab>('all')
  const [sort, setSort]             = useState<Sort>('best_match')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [closing, setClosing]       = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [proposalsVisible, setProposalsVisible] = useState(true)

  const jobSkills = job.skills ?? []
  const { data: proposals, isLoading } = useProposals(job.id)

  const processed = useMemo(() => {
    if (!proposals) return []
    let list = tab === 'shortlisted' ? proposals.filter(p => p.is_shortlisted) : proposals
    if (verifiedOnly) list = list.filter(p => p.profiles?.phone_verified || p.profiles?.edu_verified)
    return applySort(list, sort, jobSkills)
  }, [proposals, tab, sort, verifiedOnly, jobSkills])

  const totalCount       = proposals?.length ?? 0
  const shortlistedCount = (proposals ?? []).filter(p => p.is_shortlisted).length
  const verifiedCount    = (proposals ?? []).filter(p => p.profiles?.phone_verified || p.profiles?.edu_verified).length

  async function closeJob() {
    setClosing(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Job closed')
      router.push('/my-jobs')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to close job')
      setClosing(false)
    }
    setShowCloseConfirm(false)
  }

  return (
    <div className="space-y-4">
      {/* ── Management header ─────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Stats */}
          <div className="flex items-center gap-5 flex-wrap text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-foreground">{job.proposals_count ?? job.bid_count ?? 0}</span>
              <span>proposals</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Posted {timeAgo(job.created_at)}</span>
            </div>
            {shortlistedCount > 0 && (
              <div className="flex items-center gap-1.5 text-[#14a800]">
                <BarChart2 className="w-4 h-4" />
                <span className="font-semibold">{shortlistedCount}</span>
                <span>shortlisted</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {job.status === 'open' && (
            <div className="flex items-center gap-2">
              <Link
                href={`/jobs/${job.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Job
              </Link>
              {!showCloseConfirm ? (
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Close Job
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-400">Confirm close?</span>
                  <button
                    onClick={closeJob}
                    disabled={closing}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {closing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                  </button>
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Proposals section ──────────────────────────────────── */}
      <div className="card">
        {/* Header */}
        <div className="p-5 border-b border-border space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <button
              onClick={() => setProposalsVisible(v => !v)}
              className="flex items-center gap-2 group"
            >
              <h2 className="font-bold text-foreground text-lg group-hover:text-[#14a800] transition-colors">
                Proposals
              </h2>
              {proposalsVisible
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            <p className="text-sm text-muted-foreground flex items-center gap-1.5 ml-auto">
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

          {proposalsVisible && (
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
                {verifiedOnly && verifiedCount > 0 && <span className="font-bold">({verifiedCount})</span>}
              </button>
            </div>
          )}

          {/* Skill chips for best_match */}
          {proposalsVisible && sort === 'best_match' && jobSkills.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-muted-foreground">Matching skills:</span>
              {jobSkills.slice(0, 7).map(s => (
                <span key={s} className="badge badge-gray text-[11px]">{s}</span>
              ))}
              {jobSkills.length > 7 && <span className="text-xs text-[var(--faint)]">+{jobSkills.length - 7} more</span>}
            </div>
          )}
        </div>

        {proposalsVisible && (
          <>
            {/* Tabs */}
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

            {/* List */}
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

              {!isLoading && processed.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">
                    {tab === 'shortlisted' ? 'No shortlisted proposals' : verifiedOnly ? 'No verified proposals' : 'No proposals yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tab === 'shortlisted' ? 'Shortlist candidates to compare them here.' : 'Share your job to attract freelancers.'}
                  </p>
                </div>
              )}

              {!isLoading && processed.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  jobId={job.id}
                  jobBudgetType={job.budget_type}
                  matchScore={calcMatchScore(proposal, jobSkills)}
                  isTopRated={(proposal.profiles?.rating ?? 0) >= 4.8 && (proposal.profiles?.review_count ?? 0) >= 3}
                  onHired={contractId => router.push(`/contracts/${contractId}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
