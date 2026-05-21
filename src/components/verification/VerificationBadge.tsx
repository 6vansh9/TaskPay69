'use client'

import { ShieldCheck, GraduationCap } from 'lucide-react'

interface Props {
  phoneVerified?: boolean
  eduVerified?: boolean
  size?: 'sm' | 'md'
}

const TIPS = {
  phone: 'Phone number verified via OTP',
  edu: 'Student status verified via institutional email',
}

export default function VerificationBadge({ phoneVerified, eduVerified, size = 'sm' }: Props) {
  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
  const icon = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <span className="flex items-center flex-wrap gap-1.5">
      {phoneVerified && (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-[#14a800/15] text-[#4ade80] border border-[#14a800/30] ${px}`}
          title={TIPS.phone}
        >
          <ShieldCheck className={icon} />
          Phone Verified
        </span>
      )}
      {eduVerified && (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold bg-blue-950/50 text-blue-400 border border-blue-900/50 ${px}`}
          title={TIPS.edu}
        >
          <GraduationCap className={icon} />
          Student Verified
        </span>
      )}
    </span>
  )
}
