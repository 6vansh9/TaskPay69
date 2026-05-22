'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <svg viewBox="0 0 680 160" width="140" height="33" className="mx-auto mb-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="err-w"><rect x="0" y="0" width="340" height="160"/></clipPath>
            <clipPath id="err-g"><rect x="340" y="0" width="340" height="160"/></clipPath>
          </defs>
          <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" fill="#ffffff" textAnchor="middle" clipPath="url(#err-w)">TaskPay</text>
          <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" fill="#14A800" textAnchor="middle" clipPath="url(#err-g)">TaskPay</text>
          <line x1="340" y1="22" x2="340" y2="118" stroke="#14A800" strokeWidth="1" opacity="0.35"/>
        </svg>

        <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          We hit an unexpected error. Try refreshing the page — if the issue persists, contact support.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-[#14a800] text-white text-sm font-semibold hover:bg-[#12c200] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white/8 border border-white/12 text-white/70 text-sm font-medium hover:bg-white/12 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
