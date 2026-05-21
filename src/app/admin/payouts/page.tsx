'use client'

import { useState, useEffect, useCallback } from 'react'
import { Banknote, CheckCircle, XCircle, RefreshCw, Clock, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface PaymentInfo {
  payment_method?: string
  upi_id?: string
  account_number?: string
}

interface Payee {
  id: string
  full_name: string
  email: string
  bank_account: PaymentInfo | null
}

interface PayoutTx {
  id: string
  amount: number
  net_amount: number
  platform_fee: number
  created_at: string
  payout_details: PaymentInfo | null
  payee: Payee | null
  contract: { id: string; job: { title: string } | null } | null
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutTx[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/withdrawals', { cache: 'no-store' })
    if (res.ok) setPayouts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markPaid(id: string) {
    setProcessing(id)
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid' }),
    })
    if (res.ok) {
      toast.success('Payout marked as paid. Freelancer notified.')
      await load()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Failed')
    }
    setProcessing(null)
  }

  async function confirmReject() {
    if (!rejectModal) return
    setProcessing(rejectModal.id)
    const res = await fetch(`/api/admin/withdrawals/${rejectModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason: rejectReason }),
    })
    if (res.ok) {
      toast.success('Payout put on hold. Freelancer notified.')
      await load()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Failed')
    }
    setProcessing(null)
    setRejectModal(null)
    setRejectReason('')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payouts</h1>
          <p className="text-xs text-[var(--faint)] mt-0.5">Pending freelancer payments</p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-sm text-muted-foreground gap-1.5">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : payouts.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-10 h-10 text-[#14a800] mx-auto mb-3" />
          <p className="text-foreground font-medium">All caught up!</p>
          <p className="text-sm text-[var(--faint)] mt-1">No pending payout requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map(tx => {
            const busy = processing === tx.id
            const jobTitle = tx.contract?.job?.title ?? '—'
            const paymentInfo = tx.payout_details ?? tx.payee?.bank_account
            const isUpi = paymentInfo?.payment_method === 'upi' || !!(paymentInfo?.upi_id)
            return (
              <div key={tx.id} className="card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Freelancer */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-foreground">{tx.payee?.full_name ?? 'Unknown'}</span>
                      <span className="text-sm text-[var(--faint)]">{tx.payee?.email}</span>
                    </div>

                    {/* Contract */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <FileText className="w-3.5 h-3.5 text-[var(--faint)]" />
                      <span className="text-sm text-muted-foreground">{jobTitle}</span>
                    </div>

                    {/* Amount breakdown */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-[#4ade80]">
                        ₹{tx.net_amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-[var(--faint)]">
                        (₹{tx.amount.toLocaleString('en-IN')} − ₹{tx.platform_fee.toLocaleString('en-IN')} fee)
                      </span>
                    </div>

                    {/* Payment method if known */}
                    {paymentInfo && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Banknote className="w-3.5 h-3.5 text-[var(--faint)]" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {isUpi ? 'UPI' : 'Bank Transfer'}
                        </span>
                        {isUpi && paymentInfo.upi_id && (
                          <span className="text-sm text-foreground ml-1">{paymentInfo.upi_id}</span>
                        )}
                        {!isUpi && paymentInfo.account_number && (
                          <span className="text-sm text-foreground ml-1">
                            XXXX{String(paymentInfo.account_number).slice(-4)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--faint)]">
                      <Clock className="w-3 h-3" />
                      {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => markPaid(tx.id)}
                      disabled={busy}
                      className="btn gap-2 bg-[#14a800]/20 text-[#14a800] border border-[#14a800]/30 hover:bg-[#14a800]/30"
                    >
                      {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => { setRejectModal({ id: tx.id, name: tx.payee?.full_name ?? 'this user' }); setRejectReason('') }}
                      disabled={busy}
                      className="btn btn-sm gap-2 bg-red-950/30 text-red-400 border border-red-900/40 hover:bg-red-950/50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-foreground mb-1">Reject payout for {rejectModal.name}?</h2>
            <p className="text-sm text-muted-foreground mb-4">The freelancer will be notified with your reason.</p>
            <textarea
              rows={3}
              placeholder="Reason for rejection (optional)…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="input w-full text-sm resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={confirmReject} disabled={!!processing} className="btn btn-sm bg-red-600 text-foreground hover:bg-red-700 gap-2">
                <XCircle className="w-4 h-4" /> Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
