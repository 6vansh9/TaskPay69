'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Banknote, CheckCircle, RefreshCw } from 'lucide-react'

interface BankAccount {
  upi_id?: string
  account_number?: string
  ifsc?: string
  account_holder?: string
}

interface Payee {
  id: string
  full_name: string
  email: string
  bank_account: BankAccount
}

interface WithdrawalTx {
  id: string
  amount: number
  created_at: string
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
    const res = await fetch(`/api/admin/withdrawals/${id}`, { method: 'PATCH' })
    if (res.ok) {
      setWithdrawals(prev => prev.filter(w => w.id !== id))
    }
    setProcessing(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Banknote className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Pending Withdrawals</h1>
          </div>
          <button
            onClick={fetchWithdrawals}
            className="btn btn-sm btn-ghost text-gray-500"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : withdrawals.length === 0 ? (
          <div className="card p-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No pending withdrawals</p>
            <p className="text-gray-400 text-sm mt-1">All withdrawal requests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map(w => {
              const bank = w.payee?.bank_account ?? {}
              const isUpi = !!bank.upi_id
              return (
                <div key={w.id} className="card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{w.payee?.full_name ?? 'Unknown'}</span>
                        <span className="text-sm text-gray-400">{w.payee?.email}</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 mb-3">
                        ₹{w.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {isUpi ? (
                          <div><span className="font-medium">UPI:</span> {bank.upi_id}</div>
                        ) : (
                          <>
                            <div><span className="font-medium">Account:</span> {bank.account_number}</div>
                            <div><span className="font-medium">IFSC:</span> {bank.ifsc}</div>
                            {bank.account_holder && (
                              <div><span className="font-medium">Name:</span> {bank.account_holder}</div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Requested {new Date(w.created_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <button
                      onClick={() => markPaid(w.id)}
                      disabled={processing === w.id}
                      className="btn btn-primary flex-shrink-0"
                    >
                      {processing === w.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Mark as Paid
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
