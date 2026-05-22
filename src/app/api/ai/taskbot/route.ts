import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

interface ChatMessage { role: 'user' | 'assistant'; content: string }

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

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(msg: string): 'job_search' | 'budget_query' | 'stats_query' | 'general' {
  const s = msg.toLowerCase()
  if (/find.*job|job.*match|show.*job|search.*job|look.*work|browse.*job|open.*position|any.*job/i.test(s)) return 'job_search'
  if (/budget|how much|price|rate|cost|charge|worth|pay|salary/i.test(s)) return 'budget_query'
  if (/my stat|my earn|my rating|my review|my contract|my profile/i.test(s)) return 'stats_query'
  return 'general'
}

// ── Supabase data fetchers ────────────────────────────────────────────────────

async function fetchMatchingJobs(skills: string[]): Promise<string> {
  if (!skills.length) {
    const { data } = await supabaseAdmin
      .from('jobs')
      .select('id, title, budget_min, budget_max, budget_type, skills_required')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5)
    return formatJobs(data ?? [])
  }

  // Try skill overlap first, then fall back to recent jobs
  const { data: matched } = await supabaseAdmin
    .from('jobs')
    .select('id, title, budget_min, budget_max, budget_type, skills_required')
    .eq('status', 'open')
    .overlaps('skills_required', skills)
    .order('created_at', { ascending: false })
    .limit(5)

  if (matched && matched.length > 0) return formatJobs(matched)

  const { data: recent } = await supabaseAdmin
    .from('jobs')
    .select('id, title, budget_min, budget_max, budget_type, skills_required')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(5)

  return formatJobs(recent ?? [])
}

interface JobRow { id: string; title: string; budget_min: number | null; budget_max: number | null; budget_type: string | null; skills_required: string[] | null }

function formatJobs(jobs: JobRow[]): string {
  if (!jobs.length) return 'No open jobs found right now — check back soon!'
  return jobs.map(j => {
    const budget = j.budget_type === 'hourly'
      ? `₹${j.budget_min ?? 0}–₹${j.budget_max ?? 0}/hr`
      : `₹${j.budget_min ?? 0}–₹${j.budget_max ?? 0}`
    const skills = (j.skills_required ?? []).slice(0, 3).join(', ')
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://taskpay.in'}/jobs/${j.id}`
    return `• **${j.title}** — ${budget}${skills ? ` (${skills})` : ''} → ${url}`
  }).join('\n')
}

async function fetchMarketRates(keyword: string): Promise<string> {
  const kw = `%${keyword.toLowerCase()}%`
  const { data } = await supabaseAdmin
    .from('contracts')
    .select('amount, jobs:job_id(title, category)')
    .in('status', ['complete', 'active'])
    .not('amount', 'is', null)
    .limit(50)

  if (!data || data.length === 0) {
    return 'Market rate data: Based on typical Indian freelance rates, projects range from ₹5,000 for simple tasks to ₹1,50,000+ for complex projects.'
  }

  const amounts = data.map(c => c.amount as number).filter(Boolean)
  const avg = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  return `Based on ${amounts.length} contracts on TaskPay: average ₹${avg.toLocaleString('en-IN')}, range ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}.`

  void kw
}

async function fetchUserStats(userId: string): Promise<string> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('connects_balance, jobs_completed, rating, review_count, total_earnings')
    .eq('id', userId)
    .single()

  if (!profile) return ''
  const p = profile as { connects_balance: number; jobs_completed: number; rating: number; review_count: number; total_earnings: number }
  return `User stats — Connects: ${p.connects_balance}, Jobs completed: ${p.jobs_completed ?? 0}, Rating: ${(p.rating ?? 0).toFixed(1)} (${p.review_count ?? 0} reviews), Earnings: ₹${(p.total_earnings ?? 0).toLocaleString('en-IN')}.`
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(ctx: UserCtx, extraContext = ''): string {
  const isGuest     = !ctx.role || ctx.role === 'guest'
  const isFreelancer = ctx.role === 'freelancer'
  const isClient    = ctx.role === 'client'

  const userLine = ctx.name
    ? `Current user: ${ctx.name} (${ctx.role ?? 'guest'}${ctx.title ? ` — ${ctx.title}` : ''})`
    : 'Current user: Guest (not logged in)'
  const skillsLine  = ctx.skills?.length ? `Skills: ${ctx.skills.join(', ')}` : ''
  const connectsLine = ctx.connectsBalance !== undefined ? `Connects balance: ${ctx.connectsBalance}` : ''
  const jobsLine     = ctx.jobsDone ? `Jobs completed: ${ctx.jobsDone}` : ''
  const ratingLine   = ctx.rating ? `Rating: ${ctx.rating.toFixed(1)}` : ''

  return `You are TaskBot, the friendly AI assistant for TaskPay — India's first student-centric freelance marketplace.

Platform facts:
- TaskPay uses escrow payments: client funds are held safely and released only after work approval
- Connects system: freelancers get 50 free connects on signup; proposals cost 2–6 connects based on job budget (< ₹50k = 2, < ₹5L = 4, above = 6)
- Student verification: freelancers with a .edu email get a verified student badge
- Phone verification badge available for extra credibility
- Milestones: clients and freelancers can break projects into milestones with individual payments
- Dispute resolution: admin team resolves disputes within 48–72 hours
- Typical categories: Web Development, App Development, UI/UX Design, Content Writing, Digital Marketing, Data Analysis, Video Editing

${userLine}
${skillsLine}
${connectsLine}
${jobsLine}
${ratingLine}
${extraContext ? `\nContext data:\n${extraContext}` : ''}

Your behavior:
- STRICT: max 2 sentences of prose. No walls of text.
- Use bullet points (•) for any list of 2+ items — never run them into a sentence
- Always use numbers from the Context data above when answering about stats, connects, earnings — never guess
- For job listings: one bullet per job with title, budget, and link
- Use ₹ for all currency
- If a guest asks to do something requiring login, say in one sentence they need to sign up
- ${isFreelancer ? 'Help this freelancer find work and earn more' : ''}
- ${isClient ? 'Help this client find the right talent fast' : ''}
- ${isGuest ? 'Introduce TaskPay warmly and encourage sign-up' : ''}
Today's date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
  const clientCtx: UserCtx = body.userContext ?? {}

  if (!messages.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  if (!groq) {
    return NextResponse.json({ reply: "I'm offline right now — GROQ_API_KEY not configured. Please try again later." })
  }

  // Optionally enrich context from auth
  let ctx: UserCtx = { ...clientCtx }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && !ctx.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, skills, connects_balance, jobs_completed, rating, title')
        .eq('id', user.id)
        .single()
      if (profile) {
        const p = profile as { full_name: string | null; role: string; skills: string[] | null; connects_balance: number; jobs_completed: number; rating: number; title: string | null }
        ctx = {
          id: user.id,
          name: p.full_name ?? ctx.name,
          role: p.role ?? ctx.role,
          skills: p.skills ?? ctx.skills,
          connectsBalance: p.connects_balance ?? ctx.connectsBalance,
          jobsDone: p.jobs_completed ?? ctx.jobsDone,
          rating: p.rating ?? ctx.rating,
          title: p.title ?? ctx.title,
        }
      }
    }
  } catch { /* no auth — guest mode */ }

  // Detect intent from last user message
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const intent = detectIntent(lastUserMsg)

  // Always fetch real user stats when logged in so connects/earnings are never stale
  let extraContext = ''
  try {
    const fetchPromises: Promise<string>[] = []

    if (ctx.id) fetchPromises.push(fetchUserStats(ctx.id))

    if (intent === 'job_search') {
      fetchPromises.push(fetchMatchingJobs(ctx.skills ?? []).then(r => 'Matching jobs:\n' + r))
    } else if (intent === 'budget_query') {
      const keyword = lastUserMsg.replace(/budget|how much|price|rate|cost|charge|worth/gi, '').trim().slice(0, 40)
      fetchPromises.push(fetchMarketRates(keyword))
    }

    const results = await Promise.all(fetchPromises)
    extraContext = results.filter(Boolean).join('\n')
  } catch { /* best-effort */ }

  const systemPrompt = buildSystemPrompt(ctx, extraContext)

  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 250,
      temperature: 0.65,
    })

    const reply = completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I could not generate a response. Please try again.'
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    console.error('[taskbot] Groq error:', err)
    return NextResponse.json({ reply: 'I ran into an issue. Please try again in a moment.' })
  }
}
