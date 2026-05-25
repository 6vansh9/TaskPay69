'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ContractTimeline from '@/components/contracts/ContractTimeline'
import {
  AlertTriangle, ChevronRight, CheckCircle2, Clock, Eye,
  CheckCheck, Paperclip, Send, X, FileText, Image as ImageIcon,
  ExternalLink, Scale, XCircle, User, Shield,
} from 'lucide-react'
import { cn, formatCurrency, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Profile { id: string; full_name: string | null; avatar_url: string | null; role: string }

interface MilestoneData {
  id: string; name: string; description: string | null; amount: number
  status: string; due_date: string | null; delivered_at: string | null
  approved_at: string | null; created_at: string
}

interface ContractData {
  id: string; client_id: string; freelancer_id: string
  amount: number | null; status: string; created_at: string
  job: { id: string; title: string } | null
  client: Profile | null
  freelancer: Profile | null
  milestones: MilestoneData[]
}

interface DisputeData {
  id: string; status: 'open' | 'under_review' | 'resolved'
  reason: string; resolution: string | null; admin_notes: string | null
  raised_by: string; created_at: string; resolved_at: string | null
  raised_by_profile: Profile | null
  contract: ContractData | null
}

interface Evidence {
  id: string; dispute_id: string; submitted_by: string
  content: string | null; file_urls: string[]
  created_at: string
  submitter: Profile | null
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'open',         label: 'Opened',       Icon: AlertTriangle },
  { key: 'under_review', label: 'Under Review',  Icon: Eye           },
  { key: 'resolved',     label: 'Resolved',      Icon: CheckCheck    },
] as const

type DisputeStatus = 'open' | 'under_review' | 'resolved'

function stepIndex(s: DisputeStatus) {
  return STATUS_STEPS.findIndex(x => x.key === s)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Avatar({ p, size = 8 }: { p: Profile | null; size?: number }) {
  const s = `w-${size} h-${size}`
  if (p?.avatar_url) {
    return <img src={p.avatar_url} alt={p.full_name ?? ''} className={cn(s, 'rounded-full object-cover flex-shrink-0')} />
  }
  return (
    <div className={cn(s, 'rounded-full bg-[#14a800]/20 flex items-center justify-center text-xs font-bold text-[#14a800] flex-shrink-0')}>
      {(p?.full_name ?? '?')[0].toUpperCase()}
    </div>
  )
}

function FileChip({ url }: { url: string }) {
  const name = url.split('/').pop()?.split('?')[0] ?? 'file'
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/8 border border-blue-400/20 rounded-lg px-2.5 py-1.5 hover:bg-blue-400/15 transition-colors"
    >
      {isImage ? <ImageIcon className="w-3 h-3 flex-shrink-0" /> : <FileText className="w-3 h-3 flex-shrink-0" />}
      <span className="truncate max-w-[160px]">{name}</span>
    </a>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [dispute, setDispute]   = useState<DisputeData | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)

  // Evidence form
  const [evidenceText, setEvidenceText] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submittingEvidence, setSubmittingEvidence] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Admin resolve form
  const [resolveMode, setResolveMode] = useState<'freelancer' | 'client' | 'split' | null>(null)
  const [splitPct, setSplitPct]       = useState(50)
  const [resolution, setResolution]   = useState('')
  const [adminNotes, setAdminNotes]   = useState('')
  const [resolving, setResolving]     = useState(false)
  const [reviewing, setReviewing]     = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/auth/login?next=/disputes/${id}`); return }

      const [disputeRes, evidenceRes, profileRes] = await Promise.all([
        fetch(`/api/disputes/${id}`),
        fetch(`/api/disputes/${id}/evidence`),
        supabase.from('profiles').select('id, full_name, avatar_url, role').eq('id', user.id).single(),
      ])

      if (disputeRes.status === 403 || disputeRes.status === 404) {
        toast.error('Dispute not found or access denied')
        router.push('/dashboard')
        return
      }

      const disputeData: DisputeData = await disputeRes.json()
      const evidenceData: Evidence[] = evidenceRes.ok ? await evidenceRes.json() : []
      const profile = profileRes.data as Profile | null

      setDispute(disputeData)
      setEvidence(evidenceData)
      setCurrentUser(profile)
      setIsAdmin(profile?.role === 'admin')
      setLoading(false)
    })
  }, [id, router])

  const refreshEvidence = async () => {
    const res = await fetch(`/api/disputes/${id}/evidence`)
    if (res.ok) setEvidence(await res.json())
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/dispute-evidence', { method: 'POST', body: fd })
      if (res.ok) {
        const { url, name } = await res.json()
        setUploadedFiles(prev => [...prev, { url, name }])
      } else {
        const e = await res.json()
        toast.error(e.error ?? 'Upload failed')
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  const submitEvidence = async () => {
    if (!evidenceText.trim() && uploadedFiles.length === 0) {
      toast.error('Add some text or attach a file')
      return
    }
    setSubmittingEvidence(true)
    const res = await fetch(`/api/disputes/${id}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: evidenceText, file_urls: uploadedFiles.map(f => f.url) }),
    })
    if (res.ok) {
      toast.success('Evidence submitted')
      setEvidenceText('')
      setUploadedFiles([])
      await refreshEvidence()
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Failed to submit evidence')
    }
    setSubmittingEvidence(false)
  }

  const markUnderReview = async () => {
    setReviewing(true)
    const res = await fetch(`/api/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review' }),
    })
    if (res.ok) {
      toast.success('Marked as under review')
      setDispute(prev => prev ? { ...prev, status: 'under_review' } : prev)
    } else toast.error('Failed to update')
    setReviewing(false)
  }

  const submitResolve = async () => {
    if (!resolveMode) return
    if (!resolution.trim()) { toast.error('Resolution note is required'); return }
    setResolving(true)
    const body: Record<string, unknown> = { winner: resolveMode, resolution: resolution.trim(), admin_notes: adminNotes.trim() || null }
    if (resolveMode === 'split') body.split_pct = splitPct

    const res = await fetch(`/api/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success('Dispute resolved. Both parties notified.')
      setDispute(prev => prev ? { ...prev, status: 'resolved', resolution: resolution.trim(), resolved_at: new Date().toISOString() } : prev)
      setResolveMode(null)
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Failed to resolve')
    }
    setResolving(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-card">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </main>
      </div>
    )
  }

  if (!dispute) return null

  const contract   = dispute.contract
  const isParty    = currentUser?.id === contract?.client_id || currentUser?.id === contract?.freelancer_id
  const canSubmit  = isParty && dispute.status !== 'resolved'
  const curStep    = stepIndex(dispute.status)
  const isResolved = dispute.status === 'resolved'

  // Split evidence by party
  const clientEvidence     = evidence.filter(e => e.submitted_by === contract?.client_id)
  const freelancerEvidence = evidence.filter(e => e.submitted_by === contract?.freelancer_id)

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1 flex-wrap">
          <Link href="/dashboard" className="hover:text-[#14a800]">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {contract && (
            <>
              <Link href={`/contracts/${contract.id}`} className="hover:text-[#14a800] truncate max-w-[180px]">
                {contract.job?.title ?? 'Contract'}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
          <span className="text-foreground">Dispute</span>
        </nav>

        {/* ── Status tracker ──────────────────────────────────────── */}
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dispute Status</h2>
            {dispute.resolved_at && (
              <span className="text-xs text-muted-foreground">
                Resolved {timeAgo(dispute.resolved_at)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0 mt-4">
            {STATUS_STEPS.map((step, idx) => {
              const done   = idx < curStep
              const active = idx === curStep
              const Icon   = step.Icon
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center ring-2 transition-all',
                      done    && 'bg-[#14a800] ring-[#14a800] text-white',
                      active  && !isResolved && 'bg-amber-400 ring-amber-400 text-white',
                      active  && isResolved  && 'bg-[#14a800] ring-[#14a800] text-white',
                      !done && !active && 'bg-card ring-border text-muted-foreground',
                    )}>
                      {done || (active && isResolved)
                        ? <CheckCircle2 className="w-5 h-5" />
                        : active
                        ? <Icon className="w-5 h-5" />
                        : <Clock className="w-5 h-5 opacity-40" />
                      }
                    </div>
                    <span className={cn(
                      'text-xs font-medium text-center leading-tight',
                      (done || active) ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                      idx < curStep ? 'bg-[#14a800]' : 'bg-border',
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-5 flex-col lg:flex-row items-start">

          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Dispute info card */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <h1 className="font-bold text-foreground text-lg">
                    {contract?.job?.title ?? 'Dispute'}
                  </h1>
                </div>
                {contract && (
                  <Link href={`/contracts/${contract.id}`}
                    className="btn btn-ghost btn-sm text-muted-foreground gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> View Contract
                  </Link>
                )}
              </div>

              {/* Parties */}
              {contract && (
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Avatar p={contract.client} size={8} />
                    <div>
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p className="text-sm font-medium text-foreground">{contract.client?.full_name ?? 'Client'}</p>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-sm font-medium px-1">vs</div>
                  <div className="flex items-center gap-2">
                    <Avatar p={contract.freelancer} size={8} />
                    <div>
                      <p className="text-xs text-muted-foreground">Freelancer</p>
                      <p className="text-sm font-medium text-foreground">{contract.freelancer?.full_name ?? 'Freelancer'}</p>
                    </div>
                  </div>
                  {contract.amount != null && (
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">Contract value</p>
                      <p className="text-lg font-bold text-[#14a800]">{formatCurrency(contract.amount)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Raised by + date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Avatar p={dispute.raised_by_profile} size={5} />
                <span>
                  Raised by <strong className="text-foreground">{dispute.raised_by_profile?.full_name ?? 'Unknown'}</strong>
                  {' · '}{timeAgo(dispute.created_at)}
                </span>
              </div>

              {/* Reason */}
              <div className="bg-amber-500/6 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Dispute Reason</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{dispute.reason}</p>
              </div>

              {/* Resolution */}
              {isResolved && dispute.resolution && (
                <div className="bg-[#14a800]/6 border border-[#14a800]/20 rounded-xl p-4 mt-4">
                  <p className="text-xs font-bold text-[#14a800] uppercase tracking-widest mb-2">Resolution</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{dispute.resolution}</p>
                </div>
              )}
            </div>

            {/* Contract timeline */}
            {contract && (
              <ContractTimeline
                milestones={contract.milestones ?? []}
                contractStatus={contract.status}
                contractCreatedAt={contract.created_at}
                contractAmount={contract.amount ?? 0}
              />
            )}

            {/* ── Evidence Section ─────────────────────────────── */}
            <div className="card">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Evidence</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Both parties can submit text and files to support their case.</p>
              </div>

              <div className="divide-y divide-border">
                {/* Client evidence */}
                <EvidenceColumn
                  label="Client's Evidence"
                  party={contract?.client ?? null}
                  items={clientEvidence}
                  emptyMsg="No evidence submitted yet"
                />

                {/* Freelancer evidence */}
                <EvidenceColumn
                  label="Freelancer's Evidence"
                  party={contract?.freelancer ?? null}
                  items={freelancerEvidence}
                  emptyMsg="No evidence submitted yet"
                />
              </div>

              {/* Submit form */}
              {canSubmit && (
                <div className="px-5 py-5 border-t border-border bg-muted/20">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Submit Your Evidence</h3>
                  <textarea
                    rows={4}
                    placeholder="Describe your side of the story, reference any agreements, or explain what went wrong…"
                    value={evidenceText}
                    onChange={e => setEvidenceText(e.target.value)}
                    className="input w-full text-sm resize-none mb-3"
                  />

                  {/* Uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/8 border border-blue-400/20 rounded-lg px-2.5 py-1.5">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[140px]">{f.name}</span>
                          <button onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}
                            className="ml-1 hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.zip"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-secondary btn-sm gap-1.5"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {uploading ? 'Uploading…' : 'Attach File'}
                    </button>
                    <button
                      onClick={submitEvidence}
                      disabled={submittingEvidence || (!evidenceText.trim() && uploadedFiles.length === 0)}
                      className="btn btn-primary btn-sm gap-1.5 ml-auto"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingEvidence ? 'Submitting…' : 'Submit Evidence'}
                    </button>
                  </div>
                </div>
              )}

              {isResolved && (
                <div className="px-5 py-4 text-center text-sm text-muted-foreground border-t border-border">
                  This dispute has been resolved. Evidence submission is closed.
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN (admin panel) ────────────────────── */}
          {isAdmin && (
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <h2 className="font-semibold text-foreground">Admin Panel</h2>
                </div>

                {dispute.status === 'open' && (
                  <button
                    onClick={markUnderReview}
                    disabled={reviewing}
                    className="btn w-full btn-sm gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 mb-3"
                  >
                    <Eye className="w-4 h-4" />
                    {reviewing ? 'Updating…' : 'Mark Under Review'}
                  </button>
                )}

                {dispute.status !== 'resolved' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Resolve Dispute</p>
                    <button
                      onClick={() => setResolveMode('freelancer')}
                      className="btn w-full btn-sm gap-2 bg-[#14a800]/10 border border-[#14a800]/30 text-[#14a800] hover:bg-[#14a800]/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Pay Freelancer
                    </button>
                    <button
                      onClick={() => setResolveMode('client')}
                      className="btn w-full btn-sm gap-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <XCircle className="w-4 h-4" /> Refund Client
                    </button>
                    <button
                      onClick={() => setResolveMode('split')}
                      className="btn w-full btn-sm gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                    >
                      <Scale className="w-4 h-4" /> Split Payment
                    </button>
                  </div>
                )}

                {isResolved && (
                  <div className="text-center py-4">
                    <CheckCheck className="w-8 h-8 text-[#14a800] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">Dispute Resolved</p>
                    {dispute.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{dispute.admin_notes}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Quick party info */}
              <div className="card p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parties</p>
                {[contract?.client, contract?.freelancer].filter(Boolean).map(p => (
                  <div key={p!.id} className="flex items-center gap-2">
                    <Avatar p={p!} size={8} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p!.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p!.role}</p>
                    </div>
                    {p!.id === dispute.raised_by && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                        Raised
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* ── Resolve Modal ──────────────────────────────────────────── */}
      {resolveMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-border flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {resolveMode === 'freelancer' && <CheckCircle2 className="w-5 h-5 text-[#14a800]" />}
                  {resolveMode === 'client'     && <XCircle className="w-5 h-5 text-red-400" />}
                  {resolveMode === 'split'      && <Scale className="w-5 h-5 text-blue-400" />}
                  <h2 className="text-lg font-bold text-foreground">
                    {resolveMode === 'freelancer' && 'Resolve: Pay Freelancer'}
                    {resolveMode === 'client'     && 'Resolve: Refund Client'}
                    {resolveMode === 'split'      && 'Resolve: Split Payment'}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">Both parties will be notified by email and in-app.</p>
              </div>
              <button onClick={() => setResolveMode(null)} className="btn btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {resolveMode === 'split' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Freelancer receives: <span className="text-[#14a800] font-bold">{splitPct}%</span>
                    <span className="text-muted-foreground ml-2 font-normal">(Client gets {100 - splitPct}%)</span>
                  </label>
                  <input type="range" min={0} max={100} step={5} value={splitPct}
                    onChange={e => setSplitPct(Number(e.target.value))}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0% (full refund)</span><span>50/50</span><span>100% (full pay)</span>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Resolution note <span className="text-red-400">*</span></label>
                <textarea rows={4} placeholder="Explain the decision, shared with both parties."
                  value={resolution} onChange={e => setResolution(e.target.value)}
                  className="input w-full text-sm resize-none" />
              </div>

              <div>
                <label className="label">
                  Internal notes <span className="text-muted-foreground text-xs font-normal">(not shown to parties)</span>
                </label>
                <textarea rows={2} placeholder="Optional admin notes."
                  value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  className="input w-full text-sm resize-none" />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setResolveMode(null)} disabled={resolving} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={submitResolve} disabled={resolving || !resolution.trim()}
                className={cn('btn btn-sm font-semibold',
                  resolveMode === 'freelancer' && 'bg-[#14a800] text-white hover:bg-[#128a00]',
                  resolveMode === 'client'     && 'bg-red-600 text-white hover:bg-red-700',
                  resolveMode === 'split'      && 'bg-blue-600 text-white hover:bg-blue-700',
                )}>
                {resolving ? 'Resolving…' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Evidence column sub-component ────────────────────────────────────────────

function EvidenceColumn({ label, party, items, emptyMsg }: {
  label: string
  party: Profile | null
  items: Evidence[]
  emptyMsg: string
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Avatar p={party} size={6} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{items.length} submission{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <User className="w-4 h-4 flex-shrink-0" />
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(ev => (
            <div key={ev.id} className="bg-muted/40 border border-border rounded-xl p-4">
              {ev.content && (
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap mb-2">{ev.content}</p>
              )}
              {ev.file_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ev.file_urls.map((url, i) => <FileChip key={i} url={url} />)}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">{timeAgo(ev.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
