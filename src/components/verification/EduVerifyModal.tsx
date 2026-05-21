'use client'

import { useState } from 'react'
import { X, GraduationCap, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onVerified: () => void
}

export default function EduVerifyModal({ onClose, onVerified }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'enter_email' | 'enter_code'>('enter_email')
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    if (!email.includes('@')) { toast.error('Enter a valid email'); return }
    setLoading(true)
    const res = await fetch('/api/verify/edu/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error); return }
    if (data.sandbox) {
      toast.success(`Sandbox OTP: ${data.otp} — auto-verified!`)
      onVerified(); return
    }
    setStep('enter_code')
    toast.success('Verification code sent!')
  }

  async function confirmOtp() {
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return }
    setLoading(true)
    const res = await fetch('/api/verify/edu/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Student email verified!')
    onVerified()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[var(--muted)]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-foreground">Verify Student Email</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'enter_email' ? (
            <>
              <p className="text-sm text-muted-foreground">Enter your institutional email. Accepted domains: <strong>.edu</strong>, <strong>.ac.in</strong>, <strong>.ac.uk</strong>, and more.</p>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input w-full"
                autoFocus
              />
              <button onClick={sendOtp} disabled={loading} className="btn w-full bg-blue-600 hover:bg-blue-700 text-foreground rounded-full font-semibold">
                {loading ? 'Sending…' : 'Send Verification Code'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <strong className="text-foreground">{email}</strong>. Valid for 15 minutes.
              </p>

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
              <button onClick={confirmOtp} disabled={loading} className="btn w-full bg-blue-600 hover:bg-blue-700 text-foreground rounded-full font-semibold">
                {loading ? 'Verifying…' : <><ShieldCheck className="w-4 h-4" /> Verify</>}
              </button>
              <button onClick={() => setStep('enter_email')} className="btn btn-ghost btn-sm w-full text-[var(--faint)]">
                Change email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
