'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import ChatWindow from '@/components/chat/ChatWindow'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ExternalLink } from 'lucide-react'

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
  contract_id: string | null
  job: { id: string; title: string } | null
  client: ConvProfile | null
  freelancer: ConvProfile | null
}

export default function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('freelancer')
  const [conv, setConv] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data }) => setUserRole(data?.role ?? 'freelancer'))
    })

    fetch('/api/conversations')
      .then(r => r.json())
      .then((data: Conversation[]) => {
        if (!Array.isArray(data)) { setNotFound(true); setLoading(false); return }
        const found = data.find(c => c.id === id)
        if (!found) { setNotFound(true); setLoading(false); return }
        setConv(found)
        setLoading(false)
      })
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-card">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#14a800] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound || !conv || !userId) {
    return (
      <div className="flex flex-col h-screen bg-card">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Conversation not found</p>
          <p className="text-sm text-muted-foreground mb-4">This conversation doesn&apos;t exist or you don&apos;t have access.</p>
          <Link href="/messages" className="text-sm text-[#14a800] hover:underline">Back to Messages</Link>
        </div>
      </div>
    )
  }

  const other = userRole === 'client' ? conv.freelancer : conv.client

  return (
    <div className="flex flex-col h-screen bg-card">
      {/* Mobile-style top bar — no full Header on this view */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 shadow-sm">
        <button
          onClick={() => router.push('/messages')}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-background transition-colors flex-shrink-0"
          aria-label="Back to messages"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Avatar */}
        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#14a800/20] flex items-center justify-center text-sm font-bold text-[#14a800] flex-shrink-0">
            {(other?.company_name ?? other?.full_name ?? '?')[0].toUpperCase()}
          </div>
        )}

        {/* Name + job */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {other?.company_name ?? other?.full_name ?? 'Unknown'}
          </p>
          {conv.job?.title && (
            <p className="text-xs text-muted-foreground truncate">{conv.job.title}</p>
          )}
        </div>

        {/* Link to contract if available */}
        {conv.contract_id && (
          <Link
            href={`/contracts/${conv.contract_id}`}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-[#14a800]"
            title="View contract"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatWindow
          conversationId={id}
          currentUserId={userId}
          otherParty={{
            id: other?.id ?? '',
            full_name: other?.company_name ?? other?.full_name ?? null,
            avatar_url: other?.avatar_url ?? null,
          }}
        />
      </div>
    </div>
  )
}
