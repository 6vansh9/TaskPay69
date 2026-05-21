'use client'

import { Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ShareButton() {
  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Profile link copied!')
      }
    } catch {
      // user cancelled share or clipboard denied
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#14a800] transition-colors"
    >
      <Share2 className="w-3.5 h-3.5" />
      Share
    </button>
  )
}
