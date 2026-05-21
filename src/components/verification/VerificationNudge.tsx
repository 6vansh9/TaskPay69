'use client'

import { useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import PhoneVerifyModal from './PhoneVerifyModal'
import EduVerifyModal from './EduVerifyModal'

interface Props {
  phoneVerified: boolean
  eduVerified: boolean
  role: string
}

export default function VerificationNudge({ phoneVerified, eduVerified, role }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [showPhone, setShowPhone] = useState(false)
  const [showEdu, setShowEdu] = useState(false)
  const [verified, setVerified] = useState({ phone: phoneVerified, edu: eduVerified })

  const missing = [
    !verified.phone && 'phone',
    !verified.edu && role === 'freelancer' && 'edu',
  ].filter(Boolean)

  if (dismissed || missing.length === 0) return null

  return (
    <>
      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4 flex items-start gap-3 mb-6">
        <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Boost your credibility — get verified</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Verified freelancers get 2× more responses. Complete verification to stand out.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {!verified.phone && (
              <button
                onClick={() => setShowPhone(true)}
                className="btn btn-xs bg-amber-500 hover:bg-amber-600 text-foreground rounded-full px-3 py-1 text-xs font-semibold"
              >
                Verify Phone
              </button>
            )}
            {!verified.edu && role === 'freelancer' && (
              <button
                onClick={() => setShowEdu(true)}
                className="btn btn-xs bg-blue-500 hover:bg-blue-600 text-foreground rounded-full px-3 py-1 text-xs font-semibold"
              >
                Verify Student Email
              </button>
            )}
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {showPhone && (
        <PhoneVerifyModal
          onClose={() => setShowPhone(false)}
          onVerified={() => { setVerified(v => ({ ...v, phone: true })); setShowPhone(false) }}
        />
      )}
      {showEdu && (
        <EduVerifyModal
          onClose={() => setShowEdu(false)}
          onVerified={() => { setVerified(v => ({ ...v, edu: true })); setShowEdu(false) }}
        />
      )}
    </>
  )
}
