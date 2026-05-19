'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void }
  }
}

interface Props {
  contractId: string
  amount: number
  freelancerName: string
  onPaid: () => void
}

export default function RazorpayButton({ contractId, amount, freelancerName, onPaid }: Props) {
  const [loading, setLoading] = useState(false)
  const [scriptReady, setScriptReady] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)

  // Load Razorpay checkout script
  useEffect(() => {
    if (document.getElementById('rzp-script')) { setScriptReady(true); return }
    const script = document.createElement('script')
    script.id = 'rzp-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => setScriptReady(true)
    document.body.appendChild(script)
  }, [])

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId }),
      })
      const data = await res.json()

      if (!res.ok) { toast.error(data.error ?? 'Failed to create order'); setLoading(false); return }

      // Sandbox mode — Razorpay keys not configured
      if (data.sandbox) {
        toast.success('Sandbox: Escrow marked as funded (no real payment)')
        onPaid()
        setLoading(false)
        return
      }

      if (data.already_paid) { toast('Escrow already funded'); onPaid(); setLoading(false); return }

      if (!scriptReady || !window.Razorpay) {
        toast.error('Payment widget not loaded. Refresh and try again.')
        setLoading(false)
        return
      }

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'TaskPay Escrow',
        description: `Payment to ${freelancerName}`,
        order_id: data.order_id,
        theme: { color: '#14a800' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, contract_id: contractId }),
          })
          if (verifyRes.ok) {
            toast.success('Payment verified! Escrow funded.')
            onPaid()
          } else {
            const e = await verifyRes.json()
            toast.error(e.error ?? 'Verification failed')
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      })

      rzp.open()
      setLoading(false)
    } catch {
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-[#14a800]" />
        <h3 className="font-semibold text-[#1d1d1d]">Fund Escrow</h3>
        <span className="badge badge-green ml-auto">Protected</span>
      </div>
      <p className="text-sm text-[#6b6b6b] mb-4 leading-relaxed">
        Securely hold <strong className="text-[#1d1d1d]">{formatCurrency(amount)}</strong> in escrow.
        {freelancerName} receives payment only after you approve the delivery.
      </p>

      {notConfigured ? (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
          Razorpay not configured — add <code className="text-xs">RAZORPAY_KEY_ID</code> to .env.local.
        </div>
      ) : (
        <button
          onClick={handlePay}
          disabled={loading}
          className="btn btn-primary w-full gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            : <><Lock className="w-4 h-4" /> Pay {formatCurrency(amount)} into Escrow</>
          }
        </button>
      )}

      <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-[#9b9b9b]">
        <Lock className="w-3 h-3" />
        Secured by Razorpay · UPI · Cards · Net Banking
      </div>
    </div>
  )
}
