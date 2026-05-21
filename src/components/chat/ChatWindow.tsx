'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Paperclip, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

interface MessageSender {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface ChatMessage {
  id: string
  conversation_id: string | null
  sender_id: string | null
  content: string
  attachment_url: string | null
  attachment_name: string | null
  read: boolean
  created_at: string
  sender: MessageSender | null
}

interface Props {
  conversationId: string
  currentUserId: string
  otherParty: { id: string; full_name: string | null; avatar_url: string | null }
}

export default function ChatWindow({ conversationId, currentUserId, otherParty }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Load initial messages
  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`)
      .then(r => r.json())
      .then((msgs: ChatMessage[]) => {
        setMessages(msgs)
        setLoading(false)
        setTimeout(() => scrollToBottom(), 50)
      })
  }, [conversationId, scrollToBottom])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage
          // Fetch sender info if missing
          if (!newMsg.sender) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', newMsg.sender_id ?? '')
              .single()
            newMsg.sender = sender as MessageSender | null
          }
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setTimeout(() => scrollToBottom(true), 50)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, scrollToBottom])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 25 MB.')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/conversations/${conversationId}/upload`, { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return }
    setPendingAttachment({ url: data.url, name: data.name })
    toast.success('File ready — send the message to attach it.')
    inputRef.current?.focus()
  }

  const send = async () => {
    const text = input.trim()
    if (!text && !pendingAttachment) return
    if (sending) return
    setSending(true)
    setInput('')
    const attachment = pendingAttachment
    setPendingAttachment(null)

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: text,
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
      read: false,
      created_at: new Date().toISOString(),
      sender: { id: currentUserId, full_name: 'You', avatar_url: null },
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(true), 50)

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, attachment_url: attachment?.url, attachment_name: attachment?.name }),
    })

    if (!res.ok) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
      if (attachment) setPendingAttachment(attachment)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const Avatar = ({ user, size = 7 }: { user: { full_name?: string | null; avatar_url?: string | null }; size?: number }) => (
    user?.avatar_url
      ? <img src={user.avatar_url} alt="" className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
      : <div className={`w-${size} h-${size} rounded-full bg-[#14a800/20] flex items-center justify-center text-xs font-semibold text-[#14a800] flex-shrink-0`}>
          {(user?.full_name ?? '?')[0].toUpperCase()}
        </div>
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="skeleton w-full h-8 rounded" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={cn('flex gap-2.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
              {!isMe && <Avatar user={otherParty} size={7} />}
              <div className={cn('max-w-[75%] space-y-0.5', isMe ? 'items-end' : 'items-start', 'flex flex-col')}>
                <div
                  className={cn(
                    'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                    isMe
                      ? 'bg-[#14a800] text-foreground rounded-tr-sm'
                      : 'bg-card border border-border text-foreground rounded-tl-sm'
                  )}
                >
                  {msg.content}
                  {msg.attachment_url && (
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn('mt-1.5 flex items-center gap-1 text-xs underline', isMe ? 'text-green-100' : 'text-[#14a800]')}
                    >
                      <Paperclip className="w-3 h-3" />
                      {msg.attachment_name ?? 'Attachment'}
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">{timeAgo(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 bg-card flex-shrink-0">
        {/* Pending attachment preview */}
        {pendingAttachment && (
          <div className="flex items-center gap-2 mb-2 bg-[#14a800/10] border border-[#14a800]/30 rounded-lg px-3 py-2 text-sm">
            {pendingAttachment.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
              ? <ImageIcon className="w-4 h-4 text-[#14a800] flex-shrink-0" />
              : <FileText className="w-4 h-4 text-[#14a800] flex-shrink-0" />}
            <span className="flex-1 truncate text-foreground">{pendingAttachment.name}</span>
            <button onClick={() => setPendingAttachment(null)} className="text-muted-foreground hover:text-red-500 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending}
            className="btn btn-ghost p-2 rounded-xl text-muted-foreground hover:text-[#14a800] flex-shrink-0 disabled:opacity-40"
            aria-label="Attach file"
            title="Attach file (max 25 MB)"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            onChange={handleFileChange}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none input py-2 text-sm leading-relaxed max-h-28 overflow-y-auto"
            style={{ height: 'auto', minHeight: '38px' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 112)}px`
            }}
          />
          <button
            onClick={send}
            disabled={(!input.trim() && !pendingAttachment) || sending || uploading}
            className="btn btn-primary p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
