'use client'

import { useState } from 'react'
import { X, Phone, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onVerified: () => void
}

export default function PhoneVerifyModal({ onClose, onVerified }: Props) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'enter_phone' | 'enter_code'>('enter_phone')
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    if (!phone.startsWith('+') || phone.length < 10) {
      toast.error('Enter phone in E.164 format e.g. +919876543210')
      return
    }
    setLoading(true)
    const res = await fetch('/api/verify/phone/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error); return }
    if (data.sandbox) { toast.success('Sandbox: phone auto-verified!'); onVerified(); return }
    setStep('enter_code')
    toast.success('OTP sent!')
  }

  async function confirmOtp() {
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    const res = await fetch('/api/verify/phone/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Phone verified!')
    onVerified()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#14a800]" />
            <h2 className="font-semibold text-foreground">Verify Phone</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'enter_phone' ? (
            <>
              <p className="text-sm text-muted-foreground">Enter your mobile number. We'll send a one-time code via SMS.</p>
              <input
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input w-full"
                autoFocus
              />
              <button onClick={sendOtp} disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <strong>{phone}</strong>.</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="input w-full text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
              <button onClick={confirmOtp} disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Verifying…' : <><ShieldCheck className="w-4 h-4" /> Verify</>}
              </button>
              <button onClick={() => setStep('enter_phone')} className="btn btn-ghost btn-sm w-full text-[var(--faint)]">
                Change number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
