'use client'

import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  userId: string
  dark?: boolean
}

export default function MessagesNavBadge({ userId, dark = false }: Props) {
  const [unread, setUnread] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/messages/unread')
      .then(r => r.json())
      .then(data => setUnread(data.count ?? 0))

    const supabase = createClient()
    const channel = supabase
      .channel(`messages-nav:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string }
          if (msg.sender_id !== userId) setUnread(n => n + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: 'read=eq.true' },
        () => {
          // Re-fetch when messages get marked as read
          fetch('/api/messages/unread')
            .then(r => r.json())
            .then(data => setUnread(data.count ?? 0))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Clear badge when on messages page
  useEffect(() => {
    if (pathname.startsWith('/messages')) setUnread(0)
  }, [pathname])

  return (
    <Link
      href="/messages"
      className={cn(
        'relative inline-flex items-center justify-center rounded-full p-2 transition-colors',
        dark
          ? 'text-foreground/70 hover:bg-card/8 hover:text-foreground'
          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
        pathname.startsWith('/messages') && (dark ? 'bg-card/10 text-foreground' : 'bg-accent text-accent-foreground')
      )}
      aria-label={`Messages${unread > 0 ? ` (${unread} unread)` : ''}`}
    >
      <MessageSquare className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
