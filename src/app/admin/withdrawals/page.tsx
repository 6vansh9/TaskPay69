'use client'

import { useState, useEffect, useCallback } from 'react'
import { Banknote, CheckCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface BankAccount {
  upi_id?: string
  account_number?: string
  ifsc?: string
  account_holder?: string
  account_name?: string
}

interface Payee {
  id: string
  full_name: string
  email: string
  bank_account: BankAccount | null
}

interface WithdrawalTx {
  id: string
  amount: number
  created_at: string
  payout_details: BankAccount | null
  payee: Payee | null
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalTx[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/withdrawals')
    if (res.ok) setWithdrawals(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchWithdrawals() }, [fetchWithdrawals])

  async function markPaid(id: string) {
    setProcessing(id)
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid' }),
    })
    if (res.ok) {
      toast.success('Payout marked as paid.')
      setWithdrawals(prev => prev.filter(w => w.id !== id))
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Failed')
    }
    setProcessing(null)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote className="w-6 h-6 text-[#4ade80]" />
          <h1 className="text-2xl font-bold text-foreground">Pending Withdrawals</h1>
        </div>
        <button onClick={fetchWithdrawals} className="btn btn-sm btn-ghost text-muted-foreground gap-1.5">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
      ) : withdrawals.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-10 h-10 text-[#14a800] mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No pending withdrawals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map(w => {
            const bank = w.payout_details ?? w.payee?.bank_account ?? {}
            const isUpi = !!(bank as BankAccount).upi_id || (bank as BankAccount & { payment_method?: string }).payment_method === 'upi'
            return (
              <div key={w.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{w.payee?.full_name ?? 'Unknown'}</span>
                      <span className="text-sm text-[var(--faint)]">{w.payee?.email}</span>
                    </div>
                    <div className="text-2xl font-bold text-[#4ade80] mb-3">₹{w.amount.toLocaleString('en-IN')}</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {isUpi ? (
                        <div><span className="font-medium">UPI:</span> {(bank as BankAccount).upi_id}</div>
                      ) : (
                        <>
                          <div><span className="font-medium">Account:</span> {(bank as BankAccount).account_number}</div>
                          <div><span className="font-medium">IFSC:</span> {(bank as BankAccount).ifsc}</div>
                          <div><span className="font-medium">Name:</span> {(bank as BankAccount).account_name ?? (bank as BankAccount).account_holder}</div>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-[var(--faint)] mt-2">
                      {new Date(w.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button onClick={() => markPaid(w.id)} disabled={processing === w.id} className="btn btn-primary flex-shrink-0 gap-2">
                    {processing === w.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Mark as Paid
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
