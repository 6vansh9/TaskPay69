'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PayoutRequestCard from '@/components/payments/PayoutRequestCard'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { DollarSign, TrendingUp, Clock, ArrowDownLeft, ArrowUpRight, FileText, Banknote, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  contract_id: string | null
  payer_id: string | null
  payee_id: string | null
  amount: number
  platform_fee: number
  net_amount: number
  type: string
  status: string
  payment_ref: string | null
  created_at: string
  contract: { id: string; job: { title: string } | null } | null
}

interface BankAccount {
  account_number?: string
  ifsc?: string
  account_name?: string
  bank_name?: string
}

interface Profile {
  id: string
  role: string
  full_name: string | null
  total_earnings: number
  total_spent: number
  bank_account: BankAccount | null
}

const TX_LABELS: Record<string, string> = {
  escrow_fund: 'Escrow funded',
  escrow_release: 'Payment approved',
  refund: 'Refund',
  payout: 'Bank transfer',
}

const TX_STATUS: Record<string, { label: string; cls: string }> = {
  completed:        { label: 'Completed',   cls: 'badge-green'  },
  pending:          { label: 'Pending',      cls: 'badge-orange' },
  pending_transfer: { label: 'Pending transfer', cls: 'badge-orange' },
  failed:           { label: 'Failed',       cls: 'badge-red'    },
  refunded:         { label: 'Refunded',     cls: 'badge-gray'   },
}

export default function PayoutsPage() {
  const router = useRouter()
  const [profile, setProfile]           = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)

  const loadData = useCallback(async (userId: string) => {
    const supabase = createClient()
    const [{ data: p }, txRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, role, full_name, total_earnings, total_spent, bank_account')
        .eq('id', userId).single(),
      fetch('/api/transactions').then(r => r.json()),
    ])
    setProfile(p as Profile | null)
    setTransactions(Array.isArray(txRes) ? txRes : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login?next=/payouts'); return }
      loadData(user.id)
    })
  }, [router, loadData])

  const isFreelancer = profile?.role === 'freelancer'

  const totalEarned = transactions
    .filter(t => t.payee_id === profile?.id && t.type === 'escrow_release')
    .reduce((s, t) => s + t.net_amount, 0)

  const totalSpent = transactions
    .filter(t => t.payer_id === profile?.id && t.type === 'escrow_fund' && t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0)

  const pendingBalance = transactions
    .filter(t => t.payee_id === profile?.id && t.type === 'escrow_release' && t.status === 'pending_transfer')
    .reduce((s, t) => s + t.net_amount, 0)

  const pendingPayouts = transactions
    .filter(t => t.payee_id === profile?.id && t.type === 'payout' && t.status === 'pending')
    .reduce((s, t) => s + t.net_amount, 0)

  const availableToWithdraw = Math.max(0, pendingBalance - pendingPayouts)

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f7]">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-[#1d1d1d] mb-6">
          {isFreelancer ? 'Earnings & Payouts' : 'Payments & Billing'}
        </h1>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
        ) : (
          <>
            {/* Stats */}
            {(() => {
              const items = isFreelancer ? [
                { label: 'Total Earned',  value: formatCurrency(totalEarned),        icon: TrendingUp,  color: 'text-[#14a800]'  },
                { label: 'Pending Transfer', value: formatCurrency(pendingBalance), icon: Clock,       color: 'text-orange-500' },
                { label: 'Available',     value: formatCurrency(availableToWithdraw), icon: Banknote,   color: 'text-blue-500'   },
                { label: 'Platform Fee',  value: '10%',                              icon: DollarSign,  color: 'text-[#6b6b6b]'  },
              ] : [
                { label: 'Total Paid',    value: formatCurrency(totalSpent),   icon: TrendingUp, color: 'text-[#1d1d1d]'  },
                { label: 'In Escrow',     value: formatCurrency(transactions.filter(t => t.payer_id === profile?.id && t.type === 'escrow_fund' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)), icon: Clock, color: 'text-orange-500' },
                { label: 'Transactions',  value: String(transactions.length),  icon: FileText,   color: 'text-blue-500'   },
                { label: 'Protection',    value: 'Escrow',                     icon: DollarSign, color: 'text-[#14a800]'  },
              ]
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {items.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#6b6b6b]">{label}</span>
                        <div className={cn('w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center', color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#1d1d1d]">{value}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Freelancer: payout request + bank info */}
            {isFreelancer && (
              <div className="space-y-3 mb-6">
                <PayoutRequestCard
                  availableBalance={availableToWithdraw}
                  existingBankAccount={profile?.bank_account ?? null}
                  onRequested={() => profile && loadData(profile.id)}
                />
                {pendingBalance > 0 && availableToWithdraw <= 0 && (
                  <div className="card p-4 flex items-start gap-3 bg-orange-50 border border-orange-200">
                    <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-700">
                      You have {formatCurrency(pendingBalance)} in approved payments. A payout request for the full amount is already pending.
                    </p>
                  </div>
                )}
                {pendingBalance === 0 && totalEarned === 0 && (
                  <div className="card p-5 text-center text-sm text-[#6b6b6b]">
                    <Banknote className="w-8 h-8 mx-auto mb-2 text-[#e0e0e0]" />
                    No earnings yet. Complete contracts to get paid.
                  </div>
                )}
              </div>
            )}

            {/* Payout info for clients */}
            {!isFreelancer && (
              <div className="card p-4 mb-4 flex items-start gap-3 bg-blue-50 border border-blue-200">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Payments are collected via <strong>Razorpay</strong> (UPI, Cards, Net Banking) and held in escrow until you approve delivery. Freelancer payouts are processed via bank transfer within 2–3 business days.
                </p>
              </div>
            )}

            {/* Transaction ledger */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e0e0e0]">
                <h2 className="font-semibold text-[#1d1d1d]">Transaction History</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12 text-sm text-[#6b6b6b]">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-[#e0e0e0]" />
                  No transactions yet
                </div>
              ) : (
                <div className="divide-y divide-[#f0f0f0]">
                  {transactions.map(tx => {
                    const isIncoming = tx.payee_id === profile?.id
                    const displayAmount = isIncoming ? tx.net_amount : tx.amount
                    const statusCfg = TX_STATUS[tx.status] ?? { label: tx.status, cls: 'badge-gray' }
                    return (
                      <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f7f7f7] transition-colors">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                          isIncoming ? 'bg-[#e2f0d9]' : 'bg-red-50'
                        )}>
                          {isIncoming
                            ? <ArrowDownLeft className="w-4 h-4 text-[#14a800]" />
                            : <ArrowUpRight  className="w-4 h-4 text-red-500"   />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#1d1d1d]">{TX_LABELS[tx.type] ?? tx.type}</span>
                            <span className={cn('badge', statusCfg.cls)}>{statusCfg.label}</span>
                          </div>
                          <div className="text-xs text-[#6b6b6b] mt-0.5">
                            {tx.contract?.job?.title ?? (tx.contract_id ? `Contract #${tx.contract_id.slice(0, 8)}` : 'Payout request')}
                            {' · '}{timeAgo(tx.created_at)}
                          </div>
                        </div>
                        <div className={cn('text-sm font-bold flex-shrink-0 text-right', isIncoming ? 'text-[#14a800]' : 'text-red-500')}>
                          {isIncoming ? '+' : '−'}{formatCurrency(displayAmount)}
                          {tx.type === 'escrow_release' && isIncoming && (
                            <div className="text-[10px] text-[#9b9b9b] font-normal">after 10% fee</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <Link href="/contracts" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#14a800]" />
                <div>
                  <div className="text-sm font-medium text-[#1d1d1d]">View Contracts</div>
                  <div className="text-xs text-[#6b6b6b]">Track active &amp; completed work</div>
                </div>
              </Link>
              <Link href="/dashboard" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#14a800]" />
                <div>
                  <div className="text-sm font-medium text-[#1d1d1d]">Dashboard</div>
                  <div className="text-xs text-[#6b6b6b]">Overview of all activity</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
