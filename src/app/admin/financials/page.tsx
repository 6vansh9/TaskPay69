'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, Download, RefreshCw, TrendingUp, Banknote, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Tx {
  id: string
  type: string
  amount: number
  platform_fee: number
  net_amount: number
  status: string
  created_at: string
  payment_ref: string | null
  payer: { full_name: string } | null
  payee: { full_name: string } | null
  contract: { job: { title: string } | null } | null
}

interface FinancialsData {
  transactions: Tx[]
  totalRevenue: number
  adminWithdrawn: number
  availableBalance: number
}

const TYPE_LABELS: Record<string, string> = {
  escrow_fund:    'Escrow Funded',
  escrow_release: 'Payment Released',
  payout:         'Freelancer Payout',
  refund:         'Refund',
}
const STATUS_CLS: Record<string, string> = {
  completed:        'text-[#4ade80]',
  paid_out:         'text-[#4ade80]',
  pending:          'text-orange-400',
  pending_transfer: 'text-orange-400',
  on_hold:          'text-yellow-400',
  failed:           'text-red-400',
}

export default function AdminFinancialsPage() {
  const [data, setData] = useState<FinancialsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'bank'>('upi')
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', upi_id: '', account_number: '', ifsc: '', account_name: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/financials', { cache: 'no-store' })
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function exportCSV() {
    if (!data) return
    const rows = [
      ['Date', 'Type', 'Payer', 'Payee', 'Contract', 'Amount', 'Platform Fee', 'Net', 'Status'],
      ...data.transactions.map(t => [
        new Date(t.created_at).toLocaleDateString('en-IN'),
        TYPE_LABELS[t.type] ?? t.type,
        t.payer?.full_name ?? '-',
        t.payee?.full_name ?? '-',
        t.contract?.job?.title ?? '-',
        t.amount,
        t.platform_fee ?? 0,
        t.net_amount,
        t.status,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `taskpay-financials-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function submitWithdrawal() {
    const num = parseFloat(withdrawForm.amount)
    if (!num || num <= 0) { toast.error('Enter a valid amount'); return }
    if (data && num > data.availableBalance) {
      toast.error(`Amount exceeds available balance of ₹${data.availableBalance.toLocaleString('en-IN')}`)
      return
    }
    setSubmitting(true)
    const payload = withdrawMethod === 'upi'
      ? { amount: num, payment_method: 'upi', upi_id: withdrawForm.upi_id }
      : { amount: num, payment_method: 'bank', account_number: withdrawForm.account_number, ifsc: withdrawForm.ifsc, account_name: withdrawForm.account_name }

    const res = await fetch('/api/admin/financials/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const d = await res.json()
    if (res.ok) {
      toast.success(d.message ?? 'Withdrawal recorded.')
      setWithdrawForm({ amount: '', upi_id: '', account_number: '', ifsc: '', account_name: '' })
      load()
    } else {
      toast.error(d.error ?? 'Failed')
    }
    setSubmitting(false)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financials</h1>
          <p className="text-xs text-[var(--faint)] mt-0.5">Platform revenue &amp; transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn btn-ghost btn-sm text-muted-foreground gap-1.5">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={exportCSV} disabled={!data} className="btn btn-sm gap-1.5 bg-muted text-foreground hover:bg-muted border border-border">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Platform Revenue', value: data ? `₹${data.totalRevenue.toLocaleString('en-IN')}` : null, icon: TrendingUp, color: 'text-[#14a800]', bg: 'bg-[#14a800]/10' },
          { label: 'Admin Withdrawn',        value: data ? `₹${data.adminWithdrawn.toLocaleString('en-IN')}` : null, icon: Banknote, color: 'text-blue-400', bg: 'bg-blue-950/30' },
          { label: 'Available Balance',      value: data ? `₹${data.availableBalance.toLocaleString('en-IN')}` : null, icon: Wallet, color: 'text-[#4ade80]', bg: 'bg-[#14a800]/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {value ?? <span className="skeleton h-7 w-20 inline-block rounded" />}
            </div>
          </div>
        ))}
      </div>

      {/* Admin withdrawal */}
      <div className="card p-6 border border-[#14a800]/20">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-[#14a800]" />
          <h2 className="font-semibold text-foreground">Withdraw Platform Revenue</h2>
        </div>
        <div className="flex gap-1 bg-background rounded-xl p-1 mb-4 w-fit">
          {(['upi', 'bank'] as const).map(m => (
            <button key={m} onClick={() => setWithdrawMethod(m)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors uppercase', withdrawMethod === m ? 'bg-muted text-foreground' : 'text-[var(--faint)] hover:text-foreground')}>
              {m}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="field">
            <label className="label">Amount (₹) *</label>
            <input className="input" type="number" min={1} placeholder="Enter amount"
              value={withdrawForm.amount} onChange={e => setWithdrawForm(p => ({ ...p, amount: e.target.value }))} />
          </div>
          {withdrawMethod === 'upi' ? (
            <div className="field">
              <label className="label">UPI ID *</label>
              <input className="input" placeholder="admin@upi"
                value={withdrawForm.upi_id} onChange={e => setWithdrawForm(p => ({ ...p, upi_id: e.target.value }))} />
            </div>
          ) : (
            <>
              <div className="field">
                <label className="label">Account Name *</label>
                <input className="input" placeholder="As per bank"
                  value={withdrawForm.account_name} onChange={e => setWithdrawForm(p => ({ ...p, account_name: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Account Number *</label>
                <input className="input" placeholder="XXXXXXXXXXXX"
                  value={withdrawForm.account_number} onChange={e => setWithdrawForm(p => ({ ...p, account_number: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">IFSC *</label>
                <input className="input" placeholder="HDFC0001234" maxLength={11}
                  value={withdrawForm.ifsc} onChange={e => setWithdrawForm(p => ({ ...p, ifsc: e.target.value.toUpperCase() }))} />
              </div>
            </>
          )}
        </div>
        <button onClick={submitWithdrawal} disabled={submitting || !withdrawForm.amount}
          className="mt-4 btn btn-primary gap-2">
          {submitting ? 'Processing…' : 'Withdraw Platform Revenue'}
        </button>
      </div>

      {/* Transactions table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">All Transactions</h2>
          <span className="text-xs text-[var(--faint)]">{data?.transactions.length ?? 0} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Contract</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Payer</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Payee</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">Amount</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">Platform Fee</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card)]">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-[var(--faint)]">Loading…</td></tr>
              ) : (data?.transactions ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-[var(--faint)]">No transactions yet</td></tr>
              ) : (data?.transactions ?? []).map(tx => (
                <tr key={tx.id} className="hover:bg-card/50 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-foreground">{TYPE_LABELS[tx.type] ?? tx.type}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[150px] truncate">
                    {tx.contract?.job?.title ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{tx.payer?.full_name ?? '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{tx.payee?.full_name ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3 text-right text-[#14a800]">
                    {tx.platform_fee ? `₹${Number(tx.platform_fee).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('text-xs font-medium capitalize', STATUS_CLS[tx.status] ?? 'text-muted-foreground')}>
                      {tx.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
