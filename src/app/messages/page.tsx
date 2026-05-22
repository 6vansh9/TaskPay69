'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import ChatWindow from '@/components/chat/ChatWindow'
import { createClient } from '@/lib/supabase/client'
import { Search, MessageSquare, ArrowLeft } from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'

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
  last_message: { content: string; created_at: string; sender_id: string } | null
  unread_count: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('freelancer')

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations')
    if (!res.ok) return
    const data = await res.json()
    setConversations(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setUserRole(profile?.role ?? 'freelancer')

      // Load conversations AFTER auth is confirmed
      await loadConversations()

      // Real-time: refresh conversation list when a new message arrives in any of the user's conversations
      const channel = supabase
        .channel(`messages-list:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => { loadConversations() }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [router, loadConversations])

  const handleConvClick = (convId: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      router.push(`/messages/${convId}`)
    } else {
      setActiveConvId(convId)
      // Mark as read optimistically
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
      )
    }
  }

  const filtered = conversations.filter(c => {
    const other = userRole === 'client' ? c.freelancer : c.client
    const name = other?.company_name ?? other?.full_name ?? ''
    const q = search.toLowerCase()
    return name.toLowerCase().includes(q) || (c.job?.title ?? '').toLowerCase().includes(q)
  })

  const activeConv = conversations.find(c => c.id === activeConvId)
  const activeOther = activeConv
    ? (userRole === 'client' ? activeConv.freelancer : activeConv.client)
    : null

  return (
    <div className="flex flex-col h-screen bg-card">
      <Header />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          'flex flex-col bg-card border-r border-border',
          'w-full lg:w-80 xl:w-96 flex-shrink-0',
          activeConvId ? 'hidden lg:flex' : 'flex'
        )}>
          <div className="px-4 pt-5 pb-3 border-b border-border flex-shrink-0">
            <h1 className="text-xl font-bold text-foreground mb-3">Messages</h1>
            <div className="flex items-center gap-2 bg-background rounded-full px-3 py-2">
              <Search className="w-4 h-4 text-[var(--faint)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search messages"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-[var(--faint)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-3 items-center px-1 py-1">
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-muted rounded-full animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded-full animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-[var(--faint)]" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {search ? 'No results found' : 'No messages yet'}
                </p>
                <p className="text-xs text-[var(--faint)] leading-relaxed">
                  {search
                    ? 'Try a different search term'
                    : 'Once you hire or get hired, your conversations will appear here.'}
                </p>
              </div>
            )}

            {!loading && filtered.map(conv => {
              const other = userRole === 'client' ? conv.freelancer : conv.client
              const isActive = conv.id === activeConvId
              const hasUnread = conv.unread_count > 0

              return (
                <button
                  key={conv.id}
                  onClick={() => handleConvClick(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-background transition-colors text-left border-b border-border last:border-0',
                    isActive && 'bg-[#14a800]/8 border-l-[3px] border-l-[#14a800]',
                  )}
                >
                  <div className="relative flex-shrink-0">
                    {other?.avatar_url ? (
                      <img src={other.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#14a800]/15 flex items-center justify-center text-base font-bold text-[#14a800]">
                        {(other?.company_name ?? other?.full_name ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#14a800] text-white text-[9px] font-bold flex items-center justify-center border-2 border-card">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span className={cn('text-sm truncate', hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground/80')}>
                        {other?.company_name ?? other?.full_name ?? 'Unknown'}
                      </span>
                      {conv.last_message && (
                        <span className="text-[11px] text-[var(--faint)] flex-shrink-0">
                          {timeAgo(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className={cn('text-xs truncate', hasUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground')}>
                      {conv.last_message?.content
                        ? (conv.last_message.sender_id === userId ? 'You: ' : '') + conv.last_message.content
                        : conv.job?.title ?? 'New conversation'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main chat panel */}
        <main className="flex-1 hidden lg:flex flex-col min-w-0 bg-card">
          {activeConvId && activeOther && userId ? (
            <>
              <div className="bg-card border-b border-border px-6 py-3.5 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setActiveConvId(null)}
                  className="p-1 -ml-1 rounded-md hover:bg-background lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                {activeOther.avatar_url ? (
                  <img src={activeOther.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#14a800]/15 flex items-center justify-center text-sm font-bold text-[#14a800] flex-shrink-0">
                    {(activeOther.company_name ?? activeOther.full_name ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {activeOther.company_name ?? activeOther.full_name ?? 'Unknown'}
                  </p>
                  {activeConv?.job?.title && (
                    <p className="text-xs text-muted-foreground truncate">{activeConv.job.title}</p>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <ChatWindow
                  conversationId={activeConvId}
                  currentUserId={userId}
                  otherParty={{
                    id: activeOther.id,
                    full_name: activeOther.company_name ?? activeOther.full_name ?? null,
                    avatar_url: activeOther.avatar_url ?? null,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-24 h-24 rounded-full bg-[#14a800]/10 flex items-center justify-center mb-5">
                <MessageSquare className="w-10 h-10 text-[#14a800]" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Your Messages</h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Select a conversation from the list on the left to read messages and reply.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
