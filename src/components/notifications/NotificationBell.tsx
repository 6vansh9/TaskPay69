'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  created_at: string
}

interface Props {
  userId: string
}

export default function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/notifications')
    if (res.ok) setNotifications(await res.json())
    setLoading(false)
  }

  // Real-time subscription for new notifications
  useEffect(() => {
    load()

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const typeIcon: Record<string, string> = {
    hired: '🎉',
    proposal: '📝',
    payment: '💰',
    message: '💬',
    review: '⭐',
    dispute: '⚠️',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative btn btn-ghost p-2 rounded-full"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card z-50 overflow-hidden shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#14a800] hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 rounded" />)}
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">No notifications yet</div>
            )}
            {!loading && notifications.map(n => {
              const inner = (
                <>
                  <div className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-[var(--faint)] mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                  {n.link && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />}
                </>
              )
              const cls = cn(
                'flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-card transition-colors',
                !n.read && 'bg-[#14a800/10]',
                n.link && 'cursor-pointer'
              )
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className={cls}>{inner}</Link>
              ) : (
                <div key={n.id} className={cls}>{inner}</div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
