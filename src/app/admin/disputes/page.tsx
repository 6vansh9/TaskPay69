'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, ExternalLink, RefreshCw, CheckCircle, XCircle,
  Scale, Clock, CheckCheck, Eye, Sparkles, Loader2,
  RotateCcw, ThumbsUp, ThumbsDown, SplitSquareHorizontal,
  ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface AiAnalysis {
  summary: string
  evidence_for_freelancer: string[]
  evidence_for_client: string[]
  recommendation: 'pay_freelancer' | 'refund_client' | 'split'
  split_percentage: number
  reasoning: string
  confidence: number
}

interface AiState {
  loading: boolean
  analysis: AiAnalysis | null
  error: string | null
  expanded: boolean
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

const REC_CFG = {
  pay_freelancer: {
    label: 'Pay Freelancer',
    cls: 'bg-[#14a800]/20 text-[#14a800] border-[#14a800]/40',
    icon: ThumbsUp,
    mode: 'freelancer' as const,
  },
  refund_client: {
    label: 'Refund Client',
    cls: 'bg-red-950/40 text-red-400 border-red-900/40',
    icon: ThumbsDown,
    mode: 'client' as const,
  },
  split: {
    label: 'Split Payment',
    cls: 'bg-blue-950/40 text-blue-400 border-blue-900/40',
    icon: SplitSquareHorizontal,
    mode: 'split' as const,
  },
}

// ── AI Analysis Card ───────────────────────────────────────────────────────────

function AiAnalysisCard({
  disputeId,
  contractAmount,
  aiState,
  onReanalyze,
  onAccept,
  onOverride,
}: {
  disputeId: string
  contractAmount: number
  aiState: AiState
  onReanalyze: () => void
  onAccept: (analysis: AiAnalysis) => void
  onOverride: (analysis: AiAnalysis) => void
}) {
  const { loading, analysis, error, expanded } = aiState

  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-[#14a800]/30 p-5" style={{ background: 'rgba(20,168,0,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#14a800]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#14a800] animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#14a800]">AI analyzing dispute…</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reading contract, messages, and evidence</p>
          </div>
          <Loader2 className="w-4 h-4 text-[#14a800] animate-spin ml-auto" />
        </div>
        <div className="mt-4 space-y-2">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-[#14a800]/10 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/20 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
        <button onClick={onReanalyze} className="btn btn-ghost btn-sm text-muted-foreground gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  if (!analysis) return null

  const rec = REC_CFG[analysis.recommendation]
  const RecIcon = rec.icon
  const freelancerAmt = Math.round(contractAmount * (analysis.split_percentage / 100))
  const clientAmt = contractAmount - freelancerAmt
  const confidenceColor = analysis.confidence >= 75 ? '#14a800' : analysis.confidence >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="mt-4 rounded-xl border border-[#14a800]/25 overflow-hidden" style={{ background: 'rgba(10,10,10,0.9)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ background: 'rgba(20,168,0,0.08)', borderBottom: '1px solid rgba(20,168,0,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#14a800] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#14a800]">AI Dispute Analysis</p>
            <p className="text-[10px] text-muted-foreground">Powered by Groq · llama-3.3-70b</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReanalyze}
            title="Re-analyze"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary */}
        <div className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-[#14a800]/40 pl-3">
          {analysis.summary}
        </div>

        {/* Evidence columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg p-3.5" style={{ background: 'rgba(20,168,0,0.06)', border: '1px solid rgba(20,168,0,0.15)' }}>
            <p className="text-xs font-bold text-[#14a800] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ThumbsUp className="w-3 h-3" /> For Freelancer
            </p>
            <ul className="space-y-1.5">
              {(analysis.evidence_for_freelancer ?? []).map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14a800] flex-shrink-0 mt-1.5" />
                  {pt}
                </li>
              ))}
              {!analysis.evidence_for_freelancer?.length && (
                <li className="text-xs text-muted-foreground">No strong evidence found</li>
              )}
            </ul>
          </div>
          <div className="rounded-lg p-3.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ThumbsDown className="w-3 h-3" /> For Client
            </p>
            <ul className="space-y-1.5">
              {(analysis.evidence_for_client ?? []).map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                  {pt}
                </li>
              ))}
              {!analysis.evidence_for_client?.length && (
                <li className="text-xs text-muted-foreground">No strong evidence found</li>
              )}
            </ul>
          </div>
        </div>

        {/* Recommendation + amount breakdown */}
        <div className="rounded-lg p-4 space-y-3" style={{ background: '#111', border: '1px solid #222' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AI Recommendation</span>
            </div>
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border', rec.cls)}>
              <RecIcon className="w-3.5 h-3.5" />
              {rec.label}
            </span>
          </div>

          {/* Amount breakdown */}
          {contractAmount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-4 rounded-full overflow-hidden bg-[#1a1a1a]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${analysis.split_percentage}%`,
                    background: 'linear-gradient(90deg, #14a800, #22c55e)',
                  }}
                />
              </div>
              <div className="flex items-center gap-3 text-xs flex-shrink-0">
                <span className="text-[#14a800] font-bold">{formatCurrency(freelancerAmt)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-400 font-bold">{formatCurrency(clientAmt)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">{analysis.reasoning}</p>

          {/* Confidence bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">AI Confidence</span>
              <span className="font-bold" style={{ color: confidenceColor }}>{analysis.confidence}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${analysis.confidence}%`, background: confidenceColor }}
              />
            </div>
            {analysis.confidence < 60 && (
              <p className="text-[10px] text-yellow-500">Low confidence. Manual review recommended.</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onAccept(analysis)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#14a800' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Accept AI Recommendation
          </button>
          <button
            onClick={() => onOverride(analysis)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <Scale className="w-3.5 h-3.5" />
            Override
          </button>
          <button
            onClick={onReanalyze}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-analyze
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminDisputesPage() {
  const [disputes, setDisputes]         = useState<Dispute[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<Filter>('open')
  const [resolve, setResolve]           = useState<ResolveState | null>(null)
  const [reviewing, setReviewing]       = useState<string | null>(null)
  const [aiStates, setAiStates]         = useState<Record<string, AiState>>({})

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
    if (res.ok) { toast.success('Marked as under review.'); fetchDisputes() }
    else toast.error('Failed to update status.')
    setReviewing(null)
  }

  async function runAiAnalysis(disputeId: string) {
    setAiStates(prev => ({
      ...prev,
      [disputeId]: { loading: true, analysis: null, error: null, expanded: true },
    }))

    const res = await fetch('/api/ai/dispute-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispute_id: disputeId }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data.analysis) {
      setAiStates(prev => ({
        ...prev,
        [disputeId]: { loading: false, analysis: null, error: data.error ?? 'AI analysis failed. Please retry.', expanded: true },
      }))
      return
    }

    setAiStates(prev => ({
      ...prev,
      [disputeId]: { loading: false, analysis: data.analysis, error: null, expanded: true },
    }))
  }

  function acceptAiRecommendation(disputeId: string, analysis: AiAnalysis) {
    const { recommendation, split_percentage, reasoning } = analysis
    const mode = recommendation === 'pay_freelancer' ? 'freelancer'
      : recommendation === 'refund_client' ? 'client' : 'split'

    const aiNote = `[AI-assisted resolution, confidence ${analysis.confidence}%]\n\n${reasoning}`

    setResolve({
      disputeId,
      mode,
      splitPct: split_percentage,
      resolution: aiNote,
      adminNotes: 'Resolution applied via AI recommendation.',
      loading: false,
      error: null,
    })
  }

  function openOverride(disputeId: string, analysis: AiAnalysis) {
    const mode = analysis.recommendation === 'pay_freelancer' ? 'freelancer'
      : analysis.recommendation === 'refund_client' ? 'client' : 'split'
    setResolve({
      disputeId,
      mode,
      splitPct: analysis.split_percentage,
      resolution: '',
      adminNotes: '',
      loading: false,
      error: null,
    })
  }

  async function submitResolve() {
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

  const openCount   = disputes.filter(d => d.status === 'open').length
  const reviewCount = disputes.filter(d => d.status === 'under_review').length

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
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

      {/* ── Dispute list ────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
      ) : disputes.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            {filter === 'open' ? 'No open disputes, all clear!' : 'No disputes found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => {
            const statusCfg   = STATUS_CFG[d.status] ?? STATUS_CFG.open
            const StatusIcon  = statusCfg.icon
            const isOpen      = d.status === 'open'
            const isReview    = d.status === 'under_review'
            const canAi       = isOpen || isReview
            const raisedByRole = d.raised_by_profile?.role ?? 'user'
            const roleLabel   = raisedByRole === 'client' ? 'Client' : raisedByRole === 'freelancer' ? 'Freelancer' : raisedByRole
            const aiState     = aiStates[d.id]
            const hasAi       = !!aiState

            return (
              <div key={d.id} className="card p-6">
                {/* Card header */}
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {d.contract?.id && (
                      <Link href={`/contracts/${d.contract.id}`} target="_blank"
                        className="btn btn-ghost btn-sm text-muted-foreground">
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </Link>
                    )}
                    {canAi && (
                      <button
                        onClick={() => hasAi
                          ? setAiStates(prev => ({ ...prev, [d.id]: { ...prev[d.id], expanded: !prev[d.id].expanded } }))
                          : runAiAnalysis(d.id)
                        }
                        disabled={aiState?.loading}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          hasAi && aiState?.analysis
                            ? 'text-[#14a800] border border-[#14a800]/40'
                            : 'text-[#14a800] border border-[#14a800]/40 hover:bg-[#14a800]/10',
                        )}
                        style={{ background: hasAi && aiState?.analysis ? 'rgba(20,168,0,0.08)' : undefined }}
                      >
                        {aiState?.loading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Sparkles className="w-3.5 h-3.5" />
                        }
                        {aiState?.loading
                          ? 'Analyzing…'
                          : hasAi && aiState?.analysis
                          ? aiState.expanded ? 'Hide Analysis' : 'Show Analysis'
                          : 'AI Analysis'
                        }
                        {hasAi && aiState?.analysis && (
                          aiState.expanded
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Dispute reason */}
                <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg p-4 mb-4">
                  <p className="text-xs font-semibold text-yellow-500 mb-1 uppercase tracking-wide">Reason</p>
                  <p className="text-sm text-foreground/60 leading-relaxed">{d.reason}</p>
                </div>

                {/* Resolution (resolved disputes) */}
                {d.status === 'resolved' && d.resolution && (
                  <div className="bg-green-950/20 border border-green-900/40 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-green-500 mb-1 uppercase tracking-wide">Resolution</p>
                    <p className="text-sm text-foreground/60">{d.resolution}</p>
                    {d.admin_notes && <p className="text-xs text-[var(--faint)] mt-1 italic">Note: {d.admin_notes}</p>}
                  </div>
                )}

                {/* Standard action buttons */}
                {(isOpen || isReview) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {isOpen && (
                      <button onClick={() => markUnderReview(d.id)} disabled={reviewing === d.id}
                        className="btn btn-sm gap-1.5 bg-blue-950/30 text-blue-400 border border-blue-900/40 hover:bg-blue-950/50">
                        <Eye className="w-3.5 h-3.5" />
                        {reviewing === d.id ? 'Updating…' : 'Mark Under Review'}
                      </button>
                    )}
                    <button
                      onClick={() => setResolve({ disputeId: d.id, mode: 'freelancer', splitPct: 100, resolution: '', adminNotes: '', loading: false, error: null })}
                      className="btn btn-sm gap-1.5 bg-[#14a800]/20 text-[#14a800] border border-[#14a800]/30 hover:bg-[#14a800]/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Pay Freelancer
                    </button>
                    <button
                      onClick={() => setResolve({ disputeId: d.id, mode: 'client', splitPct: 0, resolution: '', adminNotes: '', loading: false, error: null })}
                      className="btn btn-sm gap-1.5 bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-950/50">
                      <XCircle className="w-3.5 h-3.5" /> Refund Client
                    </button>
                    <button
                      onClick={() => setResolve({ disputeId: d.id, mode: 'split', splitPct: 50, resolution: '', adminNotes: '', loading: false, error: null })}
                      className="btn btn-sm gap-1.5 bg-blue-950/30 text-blue-400 border border-blue-900/40 hover:bg-blue-950/50">
                      <Scale className="w-3.5 h-3.5" /> Split
                    </button>
                  </div>
                )}

                {/* AI Analysis card */}
                {hasAi && aiState.expanded && (
                  <AiAnalysisCard
                    disputeId={d.id}
                    contractAmount={d.contract?.amount ?? 0}
                    aiState={aiState}
                    onReanalyze={() => runAiAnalysis(d.id)}
                    onAccept={analysis => acceptAiRecommendation(d.id, analysis)}
                    onOverride={analysis => openOverride(d.id, analysis)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Resolve Modal ───────────────────────────────────────────── */}
      {resolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                {resolve.mode === 'freelancer' && <CheckCircle className="w-5 h-5 text-[#14a800]" />}
                {resolve.mode === 'client'     && <XCircle className="w-5 h-5 text-red-400" />}
                {resolve.mode === 'split'      && <Scale className="w-5 h-5 text-blue-400" />}
                <h2 className="text-lg font-bold text-foreground">
                  {resolve.mode === 'freelancer' && 'Resolve: Pay Freelancer'}
                  {resolve.mode === 'client'     && 'Resolve: Refund Client'}
                  {resolve.mode === 'split'      && 'Resolve: Split Payment'}
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
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Resolution note <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain the decision, shared with both parties."
                  value={resolve.resolution}
                  onChange={e => setResolve(r => r ? { ...r, resolution: e.target.value } : r)}
                  className="input w-full text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Internal notes <span className="text-[var(--faint)] text-xs">(not shown to parties)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional internal notes."
                  value={resolve.adminNotes}
                  onChange={e => setResolve(r => r ? { ...r, adminNotes: e.target.value } : r)}
                  className="input w-full text-sm resize-none"
                />
              </div>
              {resolve.error && <p className="text-sm text-red-400">{resolve.error}</p>}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setResolve(null)} disabled={resolve.loading} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                onClick={submitResolve}
                disabled={resolve.loading}
                className={cn('btn btn-sm font-semibold',
                  resolve.mode === 'freelancer' && 'bg-[#14a800] text-foreground hover:bg-[#128a00]',
                  resolve.mode === 'client'     && 'bg-red-600 text-foreground hover:bg-red-700',
                  resolve.mode === 'split'      && 'bg-blue-600 text-foreground hover:bg-blue-700',
                )}
              >
                {resolve.loading ? 'Resolving…' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
