'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, X, ChevronDown, Minus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import ChatWindow from './ChatWindow'

interface ConvProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  company_name?: string | null
  title?: string | null
}

interface Conversation {
  id: string
  client_id: string | null
  freelancer_id: string | null
  job: { id: string; title: string } | null
  client: ConvProfile | null
  freelancer: ConvProfile | null
}

interface Props {
  userId: string
  userRole: string
}

export default function FloatingChat({ userId, userRole }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!open) return
    fetch('/api/conversations')
      .then(r => r.json())
      .then((data: Conversation[]) => setConversations(data))
  }, [open])

  // Real-time message badge
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('floating-chat-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string; conversation_id: string }
          if (msg.sender_id !== userId) setUnread(n => n + 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const resetUnread = () => setUnread(0)

  const activeConv = conversations.find(c => c.id === activeConvId)
  const otherParty = activeConv
    ? (userRole === 'client' ? activeConv.freelancer : activeConv.client)
    : null

  // Hide on messages pages — the full chat UI is already there
  if (pathname.startsWith('/messages')) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && !minimized && (
        <div className="w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
          style={{ height: activeConvId ? '480px' : '320px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#14a800] text-foreground flex-shrink-0">
            <div className="flex items-center gap-2">
              {activeConvId && (
                <button onClick={() => setActiveConvId(null)} className="hover:opacity-80 mr-1">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
              )}
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {activeConvId && otherParty ? (otherParty.company_name ?? otherParty.full_name ?? 'Chat') : 'Messages'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(true)} className="hover:opacity-80 p-1 rounded">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setOpen(false); setActiveConvId(null) }} className="hover:opacity-80 p-1 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {activeConvId && otherParty ? (
            <ChatWindow
              conversationId={activeConvId}
              currentUserId={userId}
              otherParty={{
                id: otherParty.id,
                full_name: otherParty.company_name ?? otherParty.full_name ?? null,
                avatar_url: otherParty.avatar_url ?? null,
              }}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10 px-4">
                  No conversations yet.<br />Hire a freelancer or get hired to start chatting.
                </div>
              ) : conversations.map(conv => {
                const other = userRole === 'client' ? conv.freelancer : conv.client
                return (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveConvId(conv.id); resetUnread() }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card transition-colors border-b border-border last:border-0 text-left"
                  >
                    {other?.avatar_url ? (
                      <img src={other.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#14a800/20] flex items-center justify-center text-sm font-bold text-[#14a800] flex-shrink-0">
                        {(other?.company_name ?? other?.full_name ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {other?.company_name ?? other?.full_name ?? 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{conv.job?.title ?? 'Contract chat'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Minimized bar */}
      {open && minimized && (
        <div
          onClick={() => setMinimized(false)}
          className="bg-[#14a800] text-foreground px-4 py-2 rounded-xl shadow-lg cursor-pointer flex items-center gap-2 text-sm font-medium hover:bg-[#108200] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Messages
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
        </div>
      )}

      {/* FAB */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); resetUnread() }}
          className={cn(
            'w-14 h-14 rounded-full bg-[#14a800] hover:bg-[#108200] text-foreground shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95',
          )}
          aria-label="Open messages"
        >
          <MessageSquare className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-foreground text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
