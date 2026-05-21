'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, RefreshCw, CheckCircle, XCircle, Scale, Clock, CheckCheck, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Dispute {
  id: string
  reason: string
  status: 'open' | 'under_review' | 'resolved'
  resolution: string | null
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
  raised_by: string
  contract: {
    id: string
    amount: number
    client_id: string
    freelancer_id: string
    job: { title: string } | null
  } | null
  raised_by_profile: { id: string; full_name: string; email: string; role: string } | null
}

interface ResolveState {
  disputeId: string
  mode: 'freelancer' | 'client' | 'split'
  splitPct: number
  resolution: string
  adminNotes: string
  loading: boolean
  error: string | null
}

type Filter = 'open' | 'under_review' | 'resolved' | 'all'

const STATUS_CFG = {
  open:         { label: 'Open',         icon: Clock,      cls: 'bg-yellow-950/50 text-yellow-400 border-yellow-900/50' },
  under_review: { label: 'Under Review', icon: Eye,        cls: 'bg-blue-950/50 text-blue-400 border-blue-900/50' },
  resolved:     { label: 'Resolved',     icon: CheckCheck, cls: 'bg-green-950/50 text-green-400 border-green-900/50' },
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [resolve, setResolve] = useState<ResolveState | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    const param = filter === 'all' ? '' : filter
    const res = await fetch('/api/admin/disputes?status=' + param)
    if (res.ok) setDisputes(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchDisputes() }, [fetchDisputes])

  async function markUnderReview(id: string) {
    setReviewing(id)
    const res = await fetch(`/api/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review' }),
    })
    if (res.ok) {
      toast.success('Marked as under review.')
      fetchDisputes()
    } else {
      toast.error('Failed to update status.')
    }
    setReviewing(null)
  }

  const submitResolve = async () => {
    if (!resolve) return
    if (!resolve.resolution.trim()) {
      setResolve(r => r ? { ...r, error: 'Resolution note is required.' } : r)
      return
    }
    setResolve(r => r ? { ...r, loading: true, error: null } : r)
    const body: Record<string, unknown> = {
      winner: resolve.mode,
      resolution: resolve.resolution.trim(),
      admin_notes: resolve.adminNotes.trim() || null,
    }
    if (resolve.mode === 'split') body.split_pct = resolve.splitPct

    const res = await fetch(`/api/disputes/${resolve.disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setResolve(null)
      toast.success('Dispute resolved. Both parties notified.')
      fetchDisputes()
    } else {
      const { error } = await res.json()
      setResolve(r => r ? { ...r, loading: false, error: error ?? 'Something went wrong.' } : r)
    }
  }

  const openCount = disputes.filter(d => d.status === 'open').length
  const reviewCount = disputes.filter(d => d.status === 'under_review').length

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
          <div className="flex gap-1.5">
            {openCount > 0 && (
              <span className="bg-yellow-950/50 text-yellow-400 text-xs font-bold rounded-full px-2 py-0.5 border border-yellow-900/50">
                {openCount} open
              </span>
            )}
            {reviewCount > 0 && (
              <span className="bg-blue-950/50 text-blue-400 text-xs font-bold rounded-full px-2 py-0.5 border border-blue-900/50">
                {reviewCount} reviewing
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(['open', 'under_review', 'resolved', 'all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === f ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
              )}>
              {f === 'under_review' ? 'Under Review' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button onClick={fetchDisputes} className="btn btn-ghost btn-sm text-muted-foreground ml-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
      ) : disputes.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            {filter === 'open' ? 'No open disputes — all clear!' : 'No disputes found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => {
            const statusCfg = STATUS_CFG[d.status] ?? STATUS_CFG.open
            const StatusIcon = statusCfg.icon
            const isOpen = d.status === 'open'
            const isReview = d.status === 'under_review'
            const raisedByRole = d.raised_by_profile?.role ?? 'user'
            const roleLabel = raisedByRole === 'client' ? 'Client' : raisedByRole === 'freelancer' ? 'Freelancer' : raisedByRole

            return (
              <div key={d.id} className="card p-6">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground">{d.contract?.job?.title ?? 'Contract'}</span>
                      {d.contract?.amount != null && (
                        <span className="text-sm font-semibold text-[#14a800]">{formatCurrency(d.contract.amount)}</span>
                      )}
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', statusCfg.cls)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Raised by <strong className="text-foreground">{d.raised_by_profile?.full_name ?? 'Unknown'}</strong>
                      {' '}<span className="text-[var(--faint)]">({roleLabel} · {d.raised_by_profile?.email})</span>
                      {' · '}<span className="text-[var(--faint)]">{timeAgo(d.created_at)}</span>
                    </p>
                  </div>
                  {d.contract?.id && (
                    <Link href={`/contracts/${d.contract.id}`} target="_blank"
                      className="btn btn-ghost btn-sm text-muted-foreground flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </Link>
                  )}
                </div>

                <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg p-4 mb-4">
                  <p className="text-xs font-semibold text-yellow-500 mb-1 uppercase tracking-wide">Reason</p>
                  <p className="text-sm text-foreground/60 leading-relaxed">{d.reason}</p>
                </div>

                {d.status === 'resolved' && d.resolution && (
                  <div className="bg-green-950/20 border border-green-900/40 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-green-500 mb-1 uppercase tracking-wide">Resolution</p>
                    <p className="text-sm text-foreground/60">{d.resolution}</p>
                    {d.admin_notes && <p className="text-xs text-[var(--faint)] mt-1 italic">Note: {d.admin_notes}</p>}
                  </div>
                )}

                {(isOpen || isReview) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {isOpen && (
                      <button onClick={() => markUnderReview(d.id)} disabled={reviewing === d.id}
                        className="btn btn-sm gap-1.5 bg-blue-950/30 text-blue-400 border border-blue-900/40 hover:bg-blue-950/50">
                        <Eye className="w-3.5 h-3.5" />
                        {reviewing === d.id ? 'Updating…' : 'Mark Under Review'}
                      </button>
                    )}
                    <button onClick={() => setResolve({ disputeId: d.id, mode: 'freelancer', splitPct: 50, resolution: '', adminNotes: '', loading: false, error: null })}
                      className="btn btn-sm gap-1.5 bg-[#14a800]/20 text-[#14a800] border border-[#14a800]/30 hover:bg-[#14a800]/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Pay Freelancer
                    </button>
                    <button onClick={() => setResolve({ disputeId: d.id, mode: 'client', splitPct: 50, resolution: '', adminNotes: '', loading: false, error: null })}
                      className="btn btn-sm gap-1.5 bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-950/50">
                      <XCircle className="w-3.5 h-3.5" /> Refund Client
                    </button>
                    <button onClick={() => setResolve({ disputeId: d.id, mode: 'split', splitPct: 50, resolution: '', adminNotes: '', loading: false, error: null })}
                      className="btn btn-sm gap-1.5 bg-blue-950/30 text-blue-400 border border-blue-900/40 hover:bg-blue-950/50">
                      <Scale className="w-3.5 h-3.5" /> Split
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Resolve Modal */}
      {resolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                {resolve.mode === 'freelancer' && <CheckCircle className="w-5 h-5 text-[#14a800]" />}
                {resolve.mode === 'client'     && <XCircle className="w-5 h-5 text-red-400" />}
                {resolve.mode === 'split'      && <Scale className="w-5 h-5 text-blue-400" />}
                <h2 className="text-lg font-bold text-foreground">
                  {resolve.mode === 'freelancer' && 'Resolve — Pay Freelancer'}
                  {resolve.mode === 'client'     && 'Resolve — Refund Client'}
                  {resolve.mode === 'split'      && 'Resolve — Split Payment'}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">Both parties will be notified.</p>
            </div>
            <div className="p-6 space-y-4">
              {resolve.mode === 'split' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Freelancer receives: <span className="text-[#14a800] font-bold">{resolve.splitPct}%</span>
                    <span className="text-[var(--faint)] ml-2">(Client gets {100 - resolve.splitPct}%)</span>
                  </label>
                  <input type="range" min={0} max={100} step={5} value={resolve.splitPct}
                    onChange={e => setResolve(r => r ? { ...r, splitPct: Number(e.target.value) } : r)}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-xs text-[var(--faint)] mt-1">
                    <span>0% (full refund)</span><span>50/50</span><span>100% (full pay)</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Resolution note <span className="text-red-400">*</span></label>
                <textarea rows={4} placeholder="Explain the decision — shared with both parties."
                  value={resolve.resolution}
                  onChange={e => setResolve(r => r ? { ...r, resolution: e.target.value } : r)}
                  className="input w-full text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Internal notes <span className="text-[var(--faint)] text-xs">(not shown to parties)</span>
                </label>
                <textarea rows={2} placeholder="Optional internal notes."
                  value={resolve.adminNotes}
                  onChange={e => setResolve(r => r ? { ...r, adminNotes: e.target.value } : r)}
                  className="input w-full text-sm resize-none" />
              </div>
              {resolve.error && <p className="text-sm text-red-400">{resolve.error}</p>}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setResolve(null)} disabled={resolve.loading} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={submitResolve} disabled={resolve.loading}
                className={cn('btn btn-sm font-semibold',
                  resolve.mode === 'freelancer' && 'bg-[#14a800] text-foreground hover:bg-[#128a00]',
                  resolve.mode === 'client'     && 'bg-red-600 text-foreground hover:bg-red-700',
                  resolve.mode === 'split'      && 'bg-blue-600 text-foreground hover:bg-blue-700',
                )}>
                {resolve.loading ? 'Resolving…' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
