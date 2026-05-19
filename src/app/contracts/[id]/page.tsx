'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatWindow from '@/components/chat/ChatWindow'
import MilestoneTracker from '@/components/contracts/MilestoneTracker'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { ChevronRight, Briefcase, Calendar, Star, CheckCircle2, Clock, AlertCircle, XCircle, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import RazorpayButton from '@/components/payments/RazorpayButton'
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
  razorpay_payment_id: string | null
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

interface ConversationData {
  id: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  active: { label: 'Active', icon: Clock, color: 'text-[#14a800]' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-blue-500' },
  complete: { label: 'Complete', icon: CheckCircle2, color: 'text-[#14a800]' },
  disputed: { label: 'Disputed', icon: AlertCircle, color: 'text-red-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-[#6b6b6b]' },
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

    // Load or create conversation
    const supabase = createClient()
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq('contract_id', id)
      .maybeSingle()

    if (convs) {
      setConversation(convs as ConversationData)
    } else {
      // Create conversation for this contract
      const { data: newConv } = await supabase.from('conversations').insert({
        client_id: data.client_id,
        freelancer_id: data.freelancer_id,
        job_id: data.job_id,
        contract_id: id,
        type: 'contract',
      }).select('id').single()
      if (newConv) setConversation(newConv as ConversationData)
    }

    // Check if escrow is already funded
    if (data.razorpay_payment_id) setEscrowFunded(true)
    setLoading(false)
  }

  const releasePayment = async () => {
    if (!contract) return
    setReleasing(true)
    const res = await fetch('/api/razorpay/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: ContractData = await res.json()
      setContract(prev => prev ? { ...prev, status: updated.status } : prev)
      toast.success(`Contract marked as ${status}`)
    } else {
      toast.error('Failed to update contract')
    }
    setUpdating(false)
  }

  const onMilestonesChange = (milestones: MilestoneData[]) => {
    setContract(prev => prev ? { ...prev, milestones } : prev)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f7f7f7]">
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

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f7]">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#6b6b6b] mb-4 flex items-center gap-1">
          <Link href="/dashboard" className="hover:text-[#14a800]">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/contracts" className="hover:text-[#14a800]">Contracts</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1d1d1d] truncate max-w-[200px]">{contract.job?.title ?? 'Contract'}</span>
        </nav>

        {/* Header card */}
        <div className="card p-6 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`flex items-center gap-1 text-sm font-medium ${statusCfg.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusCfg.label}
                </span>
                {contract.job?.category && (
                  <span className="badge badge-gray">{contract.job.category}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[#1d1d1d] mb-1">{contract.job?.title ?? 'Contract'}</h1>
              <p className="text-xs text-[#6b6b6b]">Started {timeAgo(contract.created_at)}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#14a800]">{formatCurrency(contract.amount ?? 0)}</div>
              <div className="text-xs text-[#6b6b6b] capitalize">{contract.budget_type ?? 'fixed'} price</div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#e0e0e0]">
            {[
              { label: 'Client', profile: contract.client },
              { label: 'Freelancer', profile: contract.freelancer },
            ].map(({ label, profile }) => profile && (
              <div key={label} className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#e2f0d9] flex items-center justify-center text-sm font-bold text-[#14a800]">
                    {(profile.company_name ?? profile.full_name ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs text-[#6b6b6b]">{label}</div>
                  <div className="text-sm font-medium text-[#1d1d1d]">{profile.company_name ?? profile.full_name}</div>
                  {profile.rating != null && profile.rating > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="w-3 h-3 fill-current" />{profile.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Deadline */}
          {contract.deadline && (
            <div className="flex items-center gap-1.5 mt-3 text-sm text-[#6b6b6b]">
              <Calendar className="w-4 h-4" />
              Deadline: <span className="font-medium text-[#1d1d1d]">{new Date(contract.deadline).toLocaleDateString()}</span>
            </div>
          )}

          {/* Actions */}
          {contract.status === 'active' && (
            <div className="flex flex-wrap gap-2 mt-4">
              {!isClient && (
                <button
                  onClick={() => updateStatus('delivered')}
                  disabled={updating}
                  className="btn btn-primary btn-sm"
                >
                  <Briefcase className="w-4 h-4 mr-1" /> Mark as Delivered
                </button>
              )}
              {isClient && escrowFunded && contract.milestones?.some(m => m.status === 'delivered') && (
                <button
                  onClick={releasePayment}
                  disabled={releasing}
                  className="btn btn-primary btn-sm gap-1"
                >
                  <DollarSign className="w-4 h-4" />
                  {releasing ? 'Releasing…' : 'Release Payment'}
                </button>
              )}
              {isClient && escrowFunded && !contract.milestones?.some(m => m.status === 'delivered') && (
                <button
                  onClick={() => updateStatus('complete')}
                  disabled={updating}
                  className="btn btn-primary btn-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve & Complete
                </button>
              )}
              <button
                onClick={() => setShowDispute(true)}
                className="btn btn-danger btn-sm"
              >
                <AlertCircle className="w-4 h-4 mr-1" /> Raise Dispute
              </button>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="btn btn-ghost btn-sm text-[#6b6b6b]"
              >
                Cancel Contract
              </button>
            </div>
          )}
        </div>

        {/* Review section — shown when contract is complete */}
        {contract.status === 'complete' && (
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Reviews
              </h3>
              {!reviewed && (
                <button onClick={() => setShowReview(true)} className="btn btn-primary btn-sm">
                  Leave a Review
                </button>
              )}
            </div>
            <ReviewList revieweeId={isClient ? (contract.freelancer_id ?? '') : (contract.client_id ?? '')} />
          </div>
        )}

        <div className="flex gap-4 flex-col lg:flex-row items-start">
          {/* Left: Milestones + Payment */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Escrow payment card — client only, not yet funded */}
            {isClient && contract.status === 'active' && !escrowFunded && (
              <RazorpayButton
                contractId={id}
                amount={contract.amount ?? 0}
                freelancerName={contract.freelancer?.full_name ?? contract.freelancer?.title ?? 'the freelancer'}
                onPaid={() => setEscrowFunded(true)}
              />
            )}
            {/* Funded confirmation */}
            {isClient && escrowFunded && contract.status === 'active' && (
              <div className="card p-4 flex items-center gap-3 bg-[#f0faea] border border-[#14a800]/30">
                <CheckCircle2 className="w-5 h-5 text-[#14a800] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1d1d1d]">Escrow funded</p>
                  <p className="text-xs text-[#6b6b6b]">{formatCurrency(contract.amount ?? 0)} is held securely. Release after delivery approval.</p>
                </div>
              </div>
            )}
            <MilestoneTracker
              contractId={id}
              milestones={contract.milestones ?? []}
              isClient={isClient}
              contractStatus={contract.status}
              onChange={onMilestonesChange}
            />
          </div>

          {/* Right: Chat */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="card overflow-hidden" style={{ height: '480px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#e0e0e0] bg-white flex-shrink-0">
                {otherParty?.avatar_url ? (
                  <img src={otherParty.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#e2f0d9] flex items-center justify-center text-xs font-bold text-[#14a800]">
                    {(otherParty?.company_name ?? otherParty?.full_name ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-[#1d1d1d]">{otherParty?.company_name ?? otherParty?.full_name}</div>
                  <div className="text-[10px] text-[#6b6b6b]">{isClient ? 'Freelancer' : 'Client'}</div>
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
