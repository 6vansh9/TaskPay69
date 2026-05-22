'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWindow from '@/components/chat/ChatWindow'
import MilestoneTracker from '@/components/contracts/MilestoneTracker'
import ContractTimeline from '@/components/contracts/ContractTimeline'
import EscrowModal from '@/components/payments/EscrowModal'
import { formatCurrency, timeAgo } from '@/lib/utils'
import {
  ChevronRight, Briefcase, Calendar, Star, CheckCircle2, Clock,
  AlertCircle, XCircle, DollarSign, Handshake, Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import DisputeModal from '@/components/disputes/DisputeModal'
import ReviewModal from '@/components/reviews/ReviewModal'
import ReviewList from '@/components/reviews/ReviewList'

interface ContractProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  company_name?: string | null
  title?: string | null
  rating?: number
  skills?: string[] | null
}

interface ContractData {
  id: string
  job_id: string | null
  client_id: string | null
  freelancer_id: string | null
  amount: number | null
  agreed_rate: number | null
  budget_type: string | null
  status: string
  created_at: string
  deadline: string | null
  completed_at: string | null
  escrow_funded: boolean | null
  disputeId?: string | null
  job: { id: string; title: string; category: string | null; description: string | null; budget_type: string } | null
  client: ContractProfile | null
  freelancer: ContractProfile | null
  milestones: MilestoneData[]
}

interface MilestoneData {
  id: string
  contract_id: string | null
  name: string
  description: string | null
  amount: number
  due_date: string | null
  status: string
  revision_count: number
  delivered_at: string | null
  approved_at: string | null
  created_at: string
}

interface ConversationData { id: string }

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  pending:   { label: 'Pending',   icon: Clock,          color: 'text-amber-400',    bg: 'bg-amber-400/10 border-amber-400/30' },
  active:    { label: 'Active',    icon: Clock,          color: 'text-[#14a800]',    bg: 'bg-[#14a800]/10 border-[#14a800]/30' },
  delivered: { label: 'Delivered', icon: CheckCircle2,   color: 'text-blue-400',     bg: 'bg-blue-400/10 border-blue-400/30' },
  complete:  { label: 'Complete',  icon: CheckCircle2,   color: 'text-[#14a800]',    bg: 'bg-[#14a800]/10 border-[#14a800]/30' },
  disputed:  { label: 'Disputed',  icon: AlertCircle,    color: 'text-red-400',      bg: 'bg-red-400/10 border-red-400/30' },
  cancelled: { label: 'Cancelled', icon: XCircle,        color: 'text-muted-foreground',   bg: 'bg-muted-foreground/10 border-muted-foreground/30' },
}

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showEscrow, setShowEscrow] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [escrowFunded, setEscrowFunded] = useState(false)
  const [releasing, setReleasing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push(`/auth/login?next=/contracts/${id}`); return }
      setCurrentUserId(user.id)
      loadContract(user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadContract = async (uid: string) => {
    const res = await fetch(`/api/contracts/${id}`)
    if (res.status === 403 || res.status === 404) { router.push('/dashboard'); return }
    const data: ContractData = await res.json()
    setContract(data)

    const supabase = createClient()
    const { data: convs } = await supabase.from('conversations').select('id').eq('contract_id', id).maybeSingle()
    if (convs) {
      setConversation(convs as ConversationData)
    } else {
      const { data: newConv } = await supabase.from('conversations').insert({
        client_id: data.client_id, freelancer_id: data.freelancer_id,
        job_id: data.job_id, contract_id: id, type: 'contract',
      }).select('id').single()
      if (newConv) setConversation(newConv as ConversationData)
    }

    if (data.escrow_funded || (data as unknown as { razorpay_payment_id: string | null }).razorpay_payment_id) setEscrowFunded(true)

    // Fetch dispute ID if contract is disputed
    if (data.status === 'disputed') {
      const supabase2 = createClient()
      const { data: disputeRow } = await supabase2
        .from('disputes')
        .select('id')
        .eq('contract_id', id)
        .eq('status', 'open')
        .maybeSingle()
      if (!disputeRow) {
        const { data: reviewRow } = await supabase2
          .from('disputes')
          .select('id')
          .eq('contract_id', id)
          .eq('status', 'under_review')
          .maybeSingle()
        if (reviewRow) setContract(prev => prev ? { ...prev, disputeId: (reviewRow as { id: string }).id } : prev)
      } else {
        setContract(prev => prev ? { ...prev, disputeId: (disputeRow as { id: string }).id } : prev)
      }
    }

    setLoading(false)
  }

  const releasePayment = async () => {
    if (!contract) return
    setReleasing(true)
    const res = await fetch('/api/escrow/release', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: id }),
    })
    if (res.ok) {
      const { freelancer_payout } = await res.json()
      toast.success(`Payment of ${formatCurrency(freelancer_payout)} released to freelancer!`)
      setContract(prev => prev ? { ...prev, status: 'complete' } : prev)
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Failed to release payment')
    }
    setReleasing(false)
  }

  const updateStatus = async (status: string) => {
    if (!contract) return
    setUpdating(true)
    const res = await fetch(`/api/contracts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: ContractData = await res.json()
      setContract(prev => prev ? { ...prev, status: updated.status } : prev)
      toast.success(status === 'delivered' ? 'Marked as delivered!' : `Contract updated to ${status}`)
    } else {
      toast.error('Failed to update contract')
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-card">
        <Header />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </main>
      </div>
    )
  }

  if (!contract || !currentUserId) return null

  const isClient = currentUserId === contract.client_id
  const otherParty = isClient ? contract.freelancer : contract.client
  const statusCfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.active
  const StatusIcon = statusCfg.icon
  const amount = contract.amount ?? 0
  const platformFee = Math.round(amount * 0.10 * 100) / 100

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      {/* TEST MODE banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-center pointer-events-none select-none">
        <span className="text-amber-400 text-xs font-bold tracking-widest uppercase">⚠ Test Mode — Payments are simulated</span>
      </div>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
          <Link href="/dashboard" className="hover:text-[#14a800]">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/contracts" className="hover:text-[#14a800]">Contracts</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground truncate max-w-[200px]">{contract.job?.title ?? 'Contract'}</span>
        </nav>

        {/* ── Status + title card ───────────────────────────────── */}
        <div className="card p-6 mb-4">
          {/* Status badge */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusCfg.label}
            </span>
            {contract.job?.category && <span className="badge badge-gray">{contract.job.category}</span>}
          </div>

          <h1 className="text-xl font-bold text-foreground mb-1">{contract.job?.title ?? 'Contract'}</h1>
          <p className="text-xs text-muted-foreground mb-4">Started {timeAgo(contract.created_at)}</p>

          {/* Parties with handshake */}
          <div className="flex items-center gap-4 flex-wrap mb-4">
            {/* Client */}
            {contract.client && (
              <div className="flex items-center gap-2">
                {contract.client.avatar_url ? (
                  <img src={contract.client.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--border)]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400 ring-2 ring-[var(--border)]">
                    {(contract.client.company_name ?? contract.client.full_name ?? 'C')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-[var(--faint)] font-medium uppercase tracking-wider">Client</div>
                  <div className="text-sm font-semibold text-foreground">{contract.client.company_name ?? contract.client.full_name}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 text-[#14a800]">
              <Handshake className="w-6 h-6" />
            </div>

            {/* Freelancer */}
            {contract.freelancer && (
              <div className="flex items-center gap-2">
                {contract.freelancer.avatar_url ? (
                  <img src={contract.freelancer.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--border)]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#14a800]/20 flex items-center justify-center text-sm font-bold text-[#14a800] ring-2 ring-[var(--border)]">
                    {(contract.freelancer.full_name ?? 'F')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-[var(--faint)] font-medium uppercase tracking-wider">Freelancer</div>
                  <div className="text-sm font-semibold text-foreground">{contract.freelancer.full_name}</div>
                  {(contract.freelancer.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-amber-400">
                      <Star className="w-3 h-3 fill-current" />{(contract.freelancer.rating ?? 0).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amount + escrow badge */}
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-[#14a800]">{formatCurrency(amount)}</div>
              <div className="text-xs text-muted-foreground capitalize">{contract.budget_type ?? 'fixed'} price</div>
              {escrowFunded && (
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <Shield className="w-3 h-3 text-[#14a800]" />
                  <span className="text-[11px] text-[#14a800] font-medium">In escrow</span>
                </div>
              )}
            </div>
          </div>

          {contract.deadline && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              Deadline: <span className="font-medium text-foreground">{new Date(contract.deadline).toLocaleDateString()}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {/* Freelancer: Submit Work */}
            {!isClient && contract.status === 'active' && (
              <button onClick={() => updateStatus('delivered')} disabled={updating}
                className="btn btn-primary gap-1">
                <Briefcase className="w-4 h-4" />
                {updating ? 'Updating…' : 'Submit Work'}
              </button>
            )}

            {/* Client: Approve & Release Payment */}
            {isClient && contract.status === 'delivered' && escrowFunded && (
              <button onClick={releasePayment} disabled={releasing}
                className="btn btn-primary gap-1">
                <DollarSign className="w-4 h-4" />
                {releasing ? 'Releasing…' : 'Approve & Release Payment'}
              </button>
            )}

            {/* Client: Complete without milestones */}
            {isClient && contract.status === 'active' && escrowFunded &&
              !contract.milestones?.some(m => m.status === 'delivered') && (
              <button onClick={() => updateStatus('complete')} disabled={updating}
                className="btn btn-secondary gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Mark Complete
              </button>
            )}

            {/* Both: Raise Dispute */}
            {['active', 'delivered'].includes(contract.status) && (
              <button onClick={() => setShowDispute(true)} className="btn btn-danger gap-1">
                <AlertCircle className="w-4 h-4" /> Raise Dispute
              </button>
            )}

            {/* Both: View active dispute */}
            {contract.status === 'disputed' && contract.disputeId && (
              <Link href={`/disputes/${contract.disputeId}`} className="btn btn-sm gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20">
                <AlertCircle className="w-4 h-4" /> View Dispute
              </Link>
            )}

            {/* Client: Cancel */}
            {isClient && ['pending', 'active'].includes(contract.status) && (
              <button onClick={() => updateStatus('cancelled')} disabled={updating}
                className="btn btn-ghost text-muted-foreground gap-1">
                <XCircle className="w-4 h-4" /> Cancel Contract
              </button>
            )}
          </div>
        </div>

        {/* Review section */}
        {contract.status === 'complete' && (
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Reviews
              </h3>
              <div className="flex items-center gap-2">
                <Link
                  href={`/contracts/${id}/certificate`}
                  className="flex items-center gap-1.5 btn btn-secondary btn-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14a800]" /> View Certificate
                </Link>
                {!reviewed && (
                  <button onClick={() => setShowReview(true)} className="btn btn-primary btn-sm">
                    Leave a Review
                  </button>
                )}
              </div>
            </div>
            <ReviewList revieweeId={isClient ? (contract.freelancer_id ?? '') : (contract.client_id ?? '')} />
          </div>
        )}

        <div className="flex gap-4 flex-col lg:flex-row items-start">
          {/* Left: Escrow + Milestones */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Escrow fund card — client only, not yet funded */}
            {isClient && contract.status === 'active' && !escrowFunded && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-[#14a800]" />
                  <h3 className="font-semibold text-foreground">Fund Escrow</h3>
                  <span className="badge badge-green ml-auto">Protected</span>
                </div>
                <div className="bg-background rounded-xl border border-border divide-y divide-border mb-4 overflow-hidden">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Freelancer receives</span>
                    <span className="text-foreground font-medium">{formatCurrency(amount - platformFee)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Platform fee (10%)</span>
                    <span className="text-muted-foreground">{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-[#14a800]">{formatCurrency(amount)}</span>
                  </div>
                </div>
                <button onClick={() => setShowEscrow(true)} className="btn btn-primary w-full gap-2">
                  <Shield className="w-4 h-4" /> Pay {formatCurrency(amount)} into Escrow
                </button>
              </div>
            )}

            {/* Funded confirmation */}
            {escrowFunded && contract.status !== 'complete' && (
              <div className="card p-4 flex items-center gap-3 border-[#14a800]/30 bg-[#14a800]/5">
                <CheckCircle2 className="w-5 h-5 text-[#14a800] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    <span className="text-[#14a800]">{formatCurrency(amount)}</span> held in escrow
                  </p>
                  <p className="text-xs text-muted-foreground">Released to freelancer only after your approval.</p>
                </div>
              </div>
            )}

            <ContractTimeline
              milestones={contract.milestones ?? []}
              contractStatus={contract.status}
              contractCreatedAt={contract.created_at}
              contractAmount={contract.amount ?? 0}
            />

            <MilestoneTracker
              contractId={id}
              milestones={contract.milestones ?? []}
              isClient={isClient}
              contractStatus={contract.status}
              onChange={(milestones) => setContract(prev => prev ? { ...prev, milestones } : prev)}
            />
          </div>

          {/* Right: Chat panel */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="card overflow-hidden" style={{ height: '520px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card flex-shrink-0">
                {otherParty?.avatar_url ? (
                  <img src={otherParty.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#14a800]/20 flex items-center justify-center text-xs font-bold text-[#14a800]">
                    {(otherParty?.company_name ?? otherParty?.full_name ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-foreground">{otherParty?.company_name ?? otherParty?.full_name}</div>
                  <div className="text-[10px] text-muted-foreground">{isClient ? 'Freelancer' : 'Client'}</div>
                </div>
              </div>
              {conversation && (
                <ChatWindow
                  conversationId={conversation.id}
                  currentUserId={currentUserId}
                  otherParty={{
                    id: otherParty?.id ?? '',
                    full_name: otherParty?.company_name ?? otherParty?.full_name ?? null,
                    avatar_url: otherParty?.avatar_url ?? null,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {showEscrow && contract && (
        <EscrowModal
          contractId={id}
          jobTitle={contract.job?.title ?? 'Contract'}
          amount={contract.amount ?? 0}
          freelancerName={contract.freelancer?.full_name ?? 'the freelancer'}
          onPaid={() => { setEscrowFunded(true); setShowEscrow(false) }}
          onClose={() => setShowEscrow(false)}
        />
      )}
      {showDispute && (
        <DisputeModal
          contractId={id}
          onDisputeRaised={() => { setShowDispute(false); setContract(prev => prev ? { ...prev, status: 'disputed' } : prev) }}
          onClose={() => setShowDispute(false)}
        />
      )}
      {showReview && contract && (
        <ReviewModal
          contractId={id}
          revieweeName={otherParty?.full_name ?? otherParty?.company_name ?? 'Other Party'}
          onClose={() => setShowReview(false)}
          onSubmitted={() => { setShowReview(false); setReviewed(true) }}
        />
      )}
    </div>
  )
}
