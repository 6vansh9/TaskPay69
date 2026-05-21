'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, MapPin, Bookmark, ChevronDown, ChevronUp, Check, Shield, GraduationCap } from 'lucide-react'
import { formatCurrency, timeAgo, getInitials, cn } from '@/lib/utils'
import { useShortlistProposal, useHireFreelancer, useDeclineProposal, type ProposalWithProfile } from '@/lib/hooks'
import toast from 'react-hot-toast'

interface Props {
  proposal: ProposalWithProfile
  jobId: string
  jobBudgetType?: string
  onHired?: (contractId: string) => void
}

export default function ProposalCard({ proposal, jobId, jobBudgetType = 'fixed', onHired }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showHireConfirm, setShowHireConfirm] = useState(false)
  const p = proposal.profiles
  const { mutate: shortlist, isPending: shortlisting } = useShortlistProposal()
  const { mutate: hire, isPending: hiring } = useHireFreelancer()
  const { mutate: decline, isPending: declining } = useDeclineProposal()

  const handleShortlist = () => {
    shortlist({ proposalId: proposal.id, jobId }, {
      onSuccess: () => toast.success(proposal.is_shortlisted ? 'Removed from shortlist' : 'Added to shortlist'),
      onError: (e) => toast.error(e.message),
    })
  }

  const handleHire = () => {
    hire({ proposalId: proposal.id, jobId }, {
      onSuccess: (data) => {
        toast.success(`🎉 ${p?.full_name ?? 'Freelancer'} hired!`)
        onHired?.(data.contract?.id)
      },
      onError: (e) => { toast.error(e.message); setShowHireConfirm(false) },
    })
  }

  return (
    <div className={cn('card p-5 transition-all', proposal.is_shortlisted && 'border-[#14a800]/40 bg-[#14a800/10]')}>
      {/* Shortlist ribbon */}
      {proposal.is_shortlisted && (
        <div className="flex items-center gap-1 text-[#14a800] text-xs font-medium mb-3">
          <Check className="w-3.5 h-3.5" /> Shortlisted
        </div>
      )}

      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center text-base font-bold text-muted-foreground">
              {getInitials(p?.full_name ?? '?')}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{p?.full_name ?? 'Freelancer'}</span>
                {p?.phone_verified && (
                  <span title="Phone verified" className="badge badge-green gap-0.5">
                    <Shield className="w-3 h-3" /> Verified
                  </span>
                )}
                {p?.edu_verified && (
                  <span title="Student verified" className="badge badge-blue gap-0.5">
                    <GraduationCap className="w-3 h-3" /> Student
                  </span>
                )}
              </div>
              {p?.title && <p className="text-sm text-muted-foreground mt-0.5">{p.title}</p>}
            </div>

            {/* Rate */}
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-foreground text-lg">
                {formatCurrency(proposal.bid_amount ?? 0)}
                {jobBudgetType === 'hourly' && <span className="text-sm font-normal text-muted-foreground">/hr</span>}
              </div>
              {proposal.delivery_days && (
                <div className="text-xs text-muted-foreground">in {proposal.delivery_days} day{proposal.delivery_days !== 1 ? 's' : ''}</div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            {(p?.rating ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <Star className="w-3.5 h-3.5 fill-current" /> {p!.rating.toFixed(1)}
                <span className="text-muted-foreground font-normal">({p!.review_count})</span>
              </span>
            )}
            {(p?.jobs_completed ?? 0) > 0 && <span>{p!.jobs_completed} jobs done</span>}
            {p?.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>
            )}
            <span className="ml-auto text-xs">{timeAgo(proposal.created_at)}</span>
          </div>

          {/* Skills */}
          {p?.skills && p.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {p.skills.slice(0, 6).map(s => (
                <span key={s} className="badge badge-gray text-[11px]">{s}</span>
              ))}
            </div>
          )}

          {/* Cover letter */}
          <div className="mt-3">
            <p className={cn('text-sm text-muted-foreground leading-relaxed', !expanded && 'line-clamp-3')}>
              {proposal.cover_letter}
            </p>
            {proposal.cover_letter.length > 200 && (
              <button onClick={() => setExpanded(v => !v)} className="text-xs text-[#14a800] hover:underline mt-1 flex items-center gap-0.5">
                {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {!showHireConfirm ? (
              <>
                <button
                  onClick={handleShortlist}
                  disabled={shortlisting}
                  className={cn('btn btn-sm', proposal.is_shortlisted ? 'btn-green-outline' : 'btn-secondary')}
                >
                  <Bookmark className="w-3.5 h-3.5" fill={proposal.is_shortlisted ? 'currentColor' : 'none'} />
                  {proposal.is_shortlisted ? 'Shortlisted' : 'Shortlist'}
                </button>
                <Link href={`/profile/${proposal.freelancer_id}`} className="btn btn-secondary btn-sm">
                  View Profile
                </Link>
                <button
                  onClick={() => decline(
                    { proposalId: proposal.id, jobId },
                    {
                      onSuccess: () => toast.success('Proposal declined'),
                      onError: (e) => toast.error(e.message),
                    }
                  )}
                  disabled={declining}
                  className="btn btn-sm text-red-400 border border-red-900/40 hover:bg-red-950/30 hover:border-red-700/50"
                >
                  {declining ? 'Declining…' : 'Decline'}
                </button>
                <button
                  onClick={() => setShowHireConfirm(true)}
                  className="btn btn-primary btn-sm ml-auto"
                >
                  Hire →
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full bg-[#14a800/10] border border-[#14a800]/30 rounded-xl p-3">
                <p className="text-sm text-foreground flex-1">
                  Hire <strong>{p?.full_name}</strong> for <strong>{formatCurrency(proposal.bid_amount ?? 0)}</strong>?
                </p>
                <button onClick={() => setShowHireConfirm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button onClick={handleHire} disabled={hiring} className="btn btn-primary btn-sm">
                  {hiring ? 'Hiring…' : 'Confirm Hire'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
