'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SaveFreelancerButton({
  freelancerId,
  initialSaved = false,
  size = 'sm',
}: {
  freelancerId: string
  initialSaved?: boolean
  size?: 'sm' | 'md'
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/bookmarks/freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancer_id: freelancerId }),
      })
      if (res.ok) {
        const { saved: next } = await res.json()
        setSaved(next)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? 'Unsave freelancer' : 'Save freelancer'}
      className={cn(
        'rounded-full transition-all disabled:opacity-60 flex items-center justify-center',
        size === 'md'
          ? 'p-2 border border-border hover:border-[#14a800]/50'
          : 'p-1.5',
        saved
          ? 'text-[#14a800] hover:text-[#0f7a00]'
          : 'text-[var(--faint)] hover:text-foreground',
      )}
    >
      <Bookmark
        className={size === 'md' ? 'w-4 h-4' : 'w-4 h-4'}
        fill={saved ? 'currentColor' : 'none'}
      />
    </button>
  )
}
