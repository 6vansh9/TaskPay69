'use client'

import { useState } from 'react'
import { Banknote, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const MIN_WITHDRAWAL = 500

interface Props {
  availableBalance: number
  existingBankAccount: {
    account_number?: string
    ifsc?: string
    account_name?: string
    bank_name?: string
    upi_id?: string
  } | null
  onRequested: () => void
}

export default function PayoutRequestCard({ availableBalance, existingBankAccount, onRequested }: Props) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<'bank' | 'upi'>('bank')
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState({
    account_name:   existingBankAccount?.account_name   ?? '',
    account_number: existingBankAccount?.account_number ?? '',
    ifsc:           existingBankAccount?.ifsc           ?? '',
    bank_name:      existingBankAccount?.bank_name      ?? '',
    upi_id:         existingBankAccount?.upi_id         ?? '',
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const num = parseFloat(amount)
    if (!num || num < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`)
      return
    }
    if (num > availableBalance) { toast.error('Amount exceeds available balance'); return }
    if (method === 'bank' && (!bank.account_number || !bank.ifsc || !bank.account_name)) {
      toast.error('Fill in all required bank fields')
      return
    }
    if (method === 'upi' && !bank.upi_id) {
      toast.error('Enter a UPI ID')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/payouts/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: num, bank_account: bank }),
    })
    if (res.ok) {
      toast.success('Payout requested! Transfer within 2–3 business days.')
      setOpen(false)
      setAmount('')
      onRequested()
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Request failed')
    }
    setSubmitting(false)
  }

  if (availableBalance <= 0) return null

  return (
    <div className="card p-5 border-[#14a800]/30 bg-[#f0faea]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-[#14a800]" />
          <div className="text-left">
            <p className="font-semibold text-[#1d1d1d] text-sm">Request Bank Transfer</p>
            <p className="text-xs text-[#6b6b6b]">{formatCurrency(availableBalance)} available · min ₹{MIN_WITHDRAWAL}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#6b6b6b]" /> : <ChevronDown className="w-4 h-4 text-[#6b6b6b]" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-[#14a800]/20 pt-4">
          <div className="bg-white/70 rounded-xl p-3 text-xs text-[#6b6b6b] leading-relaxed">
            Transfers processed manually within <strong>2–3 business days</strong>. Minimum withdrawal: <strong>₹{MIN_WITHDRAWAL}</strong>.
          </div>

          {/* Method tabs */}
          <div className="flex rounded-xl border border-[#e0e0e0] overflow-hidden">
            {(['bank', 'upi'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  method === m ? 'bg-[#14a800] text-white' : 'bg-white text-[#6b6b6b] hover:bg-[#f7f7f7]'
                )}
              >
                {m === 'bank' ? 'Bank Transfer' : 'UPI'}
              </button>
            ))}
          </div>

          <div className="field">
            <label className="label">Amount to withdraw (₹) *</label>
            <input
              className="input"
              type="number"
              min={MIN_WITHDRAWAL}
              step="1"
              max={availableBalance}
              placeholder={`Min ₹${MIN_WITHDRAWAL} · Max ${formatCurrency(availableBalance)}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {method === 'upi' ? (
            <div className="field">
              <label className="label">UPI ID *</label>
              <input className="input" placeholder="yourname@upi"
                value={bank.upi_id} onChange={e => setBank(p => ({ ...p, upi_id: e.target.value }))} />
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Account holder name *</label>
                  <input className="input" placeholder="As per bank records"
                    value={bank.account_name} onChange={e => setBank(p => ({ ...p, account_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">Bank name</label>
                  <input className="input" placeholder="e.g. HDFC Bank"
                    value={bank.bank_name} onChange={e => setBank(p => ({ ...p, bank_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Account number *</label>
                  <input className="input" placeholder="XXXXXXXXXXXX"
                    value={bank.account_number} onChange={e => setBank(p => ({ ...p, account_number: e.target.value }))} />
                </div>
                <div className="field">
                  <label className="label">IFSC code *</label>
                  <input className="input" placeholder="e.g. HDFC0001234" maxLength={11}
                    value={bank.ifsc} onChange={e => setBank(p => ({ ...p, ifsc: e.target.value.toUpperCase() }))} />
                </div>
              </div>
            </>
          )}

          <button
            onClick={submit}
            disabled={submitting || !amount || parseFloat(amount) < MIN_WITHDRAWAL}
            className="btn btn-primary w-full gap-2"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : <><CheckCircle2 className="w-4 h-4" /> Request Payout</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
