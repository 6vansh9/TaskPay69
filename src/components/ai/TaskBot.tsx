'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, X, Send, ChevronDown, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface UserCtx {
  id?: string
  name?: string
  role?: string
  skills?: string[]
  connectsBalance?: number
  jobsDone?: number
  rating?: number
  title?: string
}

// ── Suggested questions per role ───────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  freelancer: [
    'Find jobs matching my skills',
    'Why am I not getting hired?',
    'How do connects work?',
  ],
  client: [
    'What budget should I set for my project?',
    'How do I find the best freelancer?',
    'How does escrow work?',
  ],
  guest: [
    'How does TaskPay work?',
    'Is TaskPay free to join?',
    'What kind of work can I find here?',
  ],
}

// ── Markdown-lite renderer (bold + links + bullet lists) ──────────────────────

function renderContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const rendered = parts.map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>
      }
      // Links: → https://...
      const linkMatch = part.match(/(https?:\/\/[^\s]+)/)
      if (linkMatch) {
        const [before, ...rest] = part.split(linkMatch[0])
        return (
          <span key={pi}>
            {before}
            <a href={linkMatch[0]} target="_blank" rel="noopener noreferrer"
              className="text-[#14a800] underline underline-offset-2 hover:text-[#22c55e] break-all">
              View job →
            </a>
            {rest.join('')}
          </span>
        )
      }
      return <span key={pi}>{part}</span>
    })

    const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-')
    return (
      <p key={li} className={cn('leading-relaxed', isBullet && 'pl-1', li > 0 && 'mt-1.5')}>
        {rendered}
      </p>
    )
  })
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-[#14a800]/60 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TaskBot() {
  const [isOpen, setIsOpen]           = useState(false)
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [isTyping, setIsTyping]       = useState(false)
  const [userCtx, setUserCtx]         = useState<UserCtx>({})
  const [ctxLoaded, setCtxLoaded]     = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const role        = userCtx.role ?? 'guest'
  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.guest
  const showSugs    = messages.length === 0 && !isTyping

  // Load user context once
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setCtxLoaded(true); return }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, skills, connects_balance, jobs_completed, rating, title')
        .eq('id', user.id)
        .single()
      if (data) {
        const p = data as { id: string; full_name: string | null; role: string; skills: string[] | null; connects_balance: number; jobs_completed: number; rating: number; title: string | null }
        setUserCtx({
          id: p.id,
          name: p.full_name ?? undefined,
          role: p.role,
          skills: p.skills ?? [],
          connectsBalance: p.connects_balance,
          jobsDone: p.jobs_completed,
          rating: p.rating,
          title: p.title ?? undefined,
        })
      }
      setCtxLoaded(true)
    })
  }, [])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    const history = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/ai/taskbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, userContext: userCtx }),
      })
      const data = await res.json()
      const reply = data.reply ?? 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "I'm having trouble connecting. Please try again.", ts: Date.now() }])
    } finally {
      setIsTyping(false)
    }
  }, [messages, isTyping, userCtx])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const reset = () => {
    setMessages([])
    setInput('')
    setIsTyping(false)
  }

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'fixed z-[55] flex flex-col overflow-hidden shadow-2xl',
            // Mobile: full screen
            'inset-0',
            // Desktop: floating panel positioned above TaskBot button
            'sm:inset-auto sm:bottom-[162px] sm:right-6 sm:w-[400px] sm:h-[500px] sm:rounded-2xl',
          )}
          style={{ background: '#111111', border: '1px solid #2a2a2a' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: '#0d0d0d', borderBottom: '1px solid #2a2a2a' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#14a800] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">TaskBot ✨</p>
                <p className="text-[10px] text-gray-500 leading-tight">Powered by Groq</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  title="New conversation"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">

            {/* Welcome message */}
            {messages.length === 0 && !isTyping && (
              <div className="rounded-xl px-4 py-3 text-sm text-gray-300 leading-relaxed"
                style={{ background: '#1a1a1a' }}>
                {ctxLoaded && userCtx.name
                  ? `Hi ${userCtx.name}! 👋 I'm TaskBot, your AI assistant. Ask me anything about TaskPay, your jobs, or how to get the best results.`
                  : `Hi there! 👋 I'm TaskBot, your AI assistant for TaskPay. How can I help you today?`
                }
              </div>
            )}

            {/* Suggestion chips */}
            {showSugs && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-gray-600 px-1">Try asking:</p>
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="block w-full text-left text-xs px-3.5 py-2.5 rounded-xl text-gray-300 transition-all hover:text-white"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#14a800' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, idx) => {
              const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1
              return (
                <div key={msg.id}>
                  <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-[#14a800] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm',
                        msg.role === 'user'
                          ? 'text-white rounded-br-sm'
                          : 'text-gray-200 rounded-bl-sm',
                      )}
                      style={{
                        background: msg.role === 'user' ? '#14a800' : '#1a1a1a',
                        border: msg.role === 'assistant' ? '1px solid #2a2a2a' : 'none',
                      }}
                    >
                      {msg.role === 'assistant'
                        ? renderContent(msg.content)
                        : <p className="leading-relaxed">{msg.content}</p>
                      }
                    </div>
                  </div>

                  {/* Quick-reply pills after the latest assistant message */}
                  {isLastAssistant && !isTyping && (
                    <div className="flex gap-2 mt-2 ml-8 flex-wrap">
                      {['Tell me more', 'What should I do?'].map(q => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="text-[11px] px-2.5 py-1 rounded-full text-gray-400 hover:text-white transition-all hover:border-[#14a800]"
                          style={{ background: '#1a1a1a', border: '1px solid #333' }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#14a800] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="rounded-xl rounded-bl-sm" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-3 py-3" style={{ background: '#0d0d0d', borderTop: '1px solid #2a2a2a' }}>
            <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything…"
                disabled={isTyping}
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none resize-none leading-relaxed min-h-[22px] max-h-24 disabled:opacity-50"
                style={{ scrollbarWidth: 'none' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mb-0.5 transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                style={{ background: input.trim() && !isTyping ? '#14a800' : '#2a2a2a' }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="text-[10px] text-gray-700 text-center mt-2">
              AI can make mistakes — verify important info
            </p>
          </div>
        </div>
      )}

      {/* ── FAB ────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-[90px] right-6 z-[45]">
        <button
          onClick={() => setIsOpen(v => !v)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 relative group',
            isOpen ? 'rotate-0' : '',
          )}
          style={{ background: '#14a800', boxShadow: '0 4px 24px rgba(20,168,0,0.35)' }}
          aria-label="Open TaskBot"
        >
          {isOpen
            ? <ChevronDown className="w-6 h-6 text-white" />
            : <Sparkles className="w-6 h-6 text-white" />
          }

          {/* Pulse ring when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: '#14a800' }} />
          )}

          {/* Tooltip */}
          {!isOpen && (
            <span className="absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-700">
              Ask TaskBot ✨
            </span>
          )}
        </button>
      </div>
    </>
  )
}
