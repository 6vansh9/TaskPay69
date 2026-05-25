'use client'

import { useState } from 'react'
import { X, Shield, Lock, Loader2, CheckCircle2, CreditCard, Smartphone, Building2, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  contractId: string
  jobTitle: string
  amount: number
  freelancerName: string
  onPaid: () => void
  onClose: () => void
}

type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet'

const PAYMENT_TABS: { id: PayMethod; label: string; icon: typeof CreditCard }[] = [
  { id: 'upi',        label: 'UPI',         icon: Smartphone },
  { id: 'netbanking', label: 'Net Banking',  icon: Building2  },
  { id: 'card',       label: 'Card',        icon: CreditCard },
  { id: 'wallet',     label: 'Wallet',      icon: Wallet     },
]

export default function EscrowModal({ contractId, jobTitle, amount, freelancerName, onPaid, onClose }: Props) {
  const [method, setMethod] = useState<PayMethod>('upi')
  const [upiId, setUpiId] = useState('')
  const [cardNum, setCardNum] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [bank, setBank] = useState('')
  const [wallet, setWallet] = useState('')
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)

  const platformFee = Math.round(amount * 0.10 * 100) / 100
  const freelancerGets = amount - platformFee

  const inputCls = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-[var(--faint)] focus:border-[#14a800] focus:outline-none bg-background transition-colors'

  async function handlePay() {
    setPaying(true)
    // Simulate network delay
    await new Promise(r => setTimeout(r, 2000))

    const res = await fetch('/api/escrow/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: contractId }),
    })

    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error ?? 'Payment failed')
      setPaying(false)
      return
    }

    setSuccess(true)
    setTimeout(() => { onPaid(); onClose() }, 2200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* TEST MODE banner */}
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">⚠ Test Mode: No real payment processed</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#14a800]" />
            <div>
              <h2 className="font-semibold text-foreground text-sm">Fund Escrow</h2>
              <p className="text-xs text-[var(--faint)] truncate max-w-[200px]">{jobTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--faint)] hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#14a800]/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-[#14a800]" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">✅ Escrow Funded Successfully</h3>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(amount)} is now held securely in escrow.
              {freelancerName} has been notified to start working.
            </p>
          </div>
        ) : (
          <>
            {/* Amount breakdown */}
            <div className="mx-5 mt-5 rounded-xl border border-border divide-y divide-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Freelancer receives</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(freelancerGets)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-background">
                <span className="text-sm text-muted-foreground">Platform fee (10%)</span>
                <span className="text-sm text-muted-foreground">{formatCurrency(platformFee)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Total to pay</span>
                <span className="text-base font-bold text-[#14a800]">{formatCurrency(amount)}</span>
              </div>
            </div>

            {/* Payment method tabs */}
            <div className="px-5 mt-5">
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-background rounded-xl border border-border">
                {PAYMENT_TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setMethod(id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      method === id ? 'bg-[#14a800] text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific inputs */}
            <div className="px-5 mt-4 space-y-3">
              {method === 'upi' && (
                <input className={inputCls} value={upiId} onChange={e => setUpiId(e.target.value)}
                  placeholder="Enter UPI ID, e.g. name@upi" />
              )}
              {method === 'card' && (
                <>
                  <input className={inputCls} value={cardNum} onChange={e => setCardNum(e.target.value)}
                    placeholder="Card number" maxLength={19} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputCls} value={cardExpiry} onChange={e => setCardExpiry(e.target.value)}
                      placeholder="MM / YY" maxLength={7} />
                    <input className={inputCls} value={cardCvv} onChange={e => setCardCvv(e.target.value)}
                      placeholder="CVV" maxLength={4} type="password" />
                  </div>
                  <p className="text-[11px] text-[var(--faint)]">Test: 4111 1111 1111 1111 · 12/28 · 123</p>
                </>
              )}
              {method === 'netbanking' && (
                <select className={inputCls} value={bank} onChange={e => setBank(e.target.value)}>
                  <option value="">Select your bank</option>
                  {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Yes Bank', 'PNB', 'BOB'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
              {method === 'wallet' && (
                <select className={inputCls} value={wallet} onChange={e => setWallet(e.target.value)}>
                  <option value="">Select wallet</option>
                  {['Paytm', 'PhonePe', 'Amazon Pay', 'MobiKwik', 'Freecharge'].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Pay button */}
            <div className="px-5 pb-5 mt-5">
              <button type="button" onClick={handlePay} disabled={paying}
                className="w-full py-3.5 rounded-xl bg-[#14a800] text-foreground font-semibold text-sm hover:bg-[#0f7a00] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {paying
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                  : <><Lock className="w-4 h-4" /> Pay {formatCurrency(amount)} &amp; Fund Escrow</>
                }
              </button>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-[var(--faint)]">
                <Shield className="w-3 h-3" />
                Secured by TaskPay Escrow · Released only on your approval
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
