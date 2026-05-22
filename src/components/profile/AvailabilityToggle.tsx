'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AvailabilityToggle({
  profileId,
  initialAvailable,
}: {
  profileId: string
  initialAvailable: boolean
}) {
  const [available, setAvailable] = useState(initialAvailable)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    const next = !available
    await supabase.from('profiles').update({ is_available: next }).eq('id', profileId)
    setAvailable(next)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all disabled:opacity-60 ${
        available
          ? 'bg-[#14a800]/15 border-[#14a800]/40 text-[#14a800] hover:bg-[#14a800]/25'
          : 'bg-muted border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
      }`}
      title="Click to toggle your availability"
    >
      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${available ? 'bg-[#14a800] animate-pulse' : 'bg-muted-foreground'}`} />
      {available ? 'Available Now' : 'Not Available'}
    </button>
  )
}
