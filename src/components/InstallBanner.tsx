'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'tp_install_dismissed'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Don't show if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a short delay so it doesn't immediately pop
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show || !deferredPrompt) return null

  const dismiss = () => {
    setShow(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  const install = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setShow(false)
    if (outcome === 'accepted') setDeferredPrompt(null)
    setInstalling(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0f1f0f 0%, #071207 100%)',
          border: '1px solid rgba(20,168,0,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(20,168,0,0.06)',
        }}
      >
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-[#14a800]/20 border border-[#14a800]/30 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 680 160" width="28" height="7" xmlns="http://www.w3.org/2000/svg">
            <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" fill="#14A800" textAnchor="middle">TaskPay</text>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install TaskPay</p>
          <p className="text-xs text-white/50 leading-tight">Add to home screen for quick access</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={dismiss}
            className="text-white/30 hover:text-white/60 transition-colors p-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={install}
            disabled={installing}
            className="px-3 py-1.5 rounded-lg bg-[#14a800] text-white text-xs font-semibold hover:bg-[#12c200] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {installing ? '…' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  )
}
