import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

interface MilestoneRow {
  id: string; name: string; amount: number; status: string
  delivered_at: string | null; approved_at: string | null; due_date: string | null
}

interface ProfileRow { id: string; full_name: string | null }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminCheck } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if ((adminCheck as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  if (!groq) return NextResponse.json({ error: 'Groq API key not configured' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const { dispute_id } = body as { dispute_id?: string }
  if (!dispute_id) return NextResponse.json({ error: 'dispute_id required' }, { status: 400 })

  // ── Fetch full dispute + contract data ──────────────────────────────────────

  const { data: dispute, error: dErr } = await supabaseAdmin
    .from('disputes')
    .select(`
      id, reason, status, created_at,
      raised_by_profile:raised_by(id, full_name, role),
      contract:contract_id(
        id, amount, status, created_at,
        job:job_id(id, title, description, budget_min, budget_max),
        client:client_id(id, full_name),
        freelancer:freelancer_id(id, full_name),
        milestones(id, name, amount, status, due_date, delivered_at, approved_at)
      )
    `)
    .eq('id', dispute_id)
    .single()

  if (dErr || !dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  const contract = dispute.contract as unknown as {
    id: string; amount: number; status: string; created_at: string
    job: { title: string; description?: string; budget_min?: number; budget_max?: number } | null
    client: ProfileRow | null
    freelancer: ProfileRow | null
    milestones: MilestoneRow[]
  } | null

  const raisedBy = dispute.raised_by_profile as unknown as { full_name: string | null; role: string } | null

  // ── Fetch contract chat messages ────────────────────────────────────────────

  let chatLines = 'No chat messages found.'
  if (contract?.id) {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('contract_id', contract.id)
      .maybeSingle()

    if (conv?.id) {
      const { data: msgs } = await supabaseAdmin
        .from('messages')
        .select('content, created_at, sender:sender_id(full_name)')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(60)

      if (msgs && msgs.length > 0) {
        chatLines = msgs
          .map(m => {
            const sender = (m.sender as { full_name?: string } | null)?.full_name ?? 'User'
            const date = new Date(m.created_at).toLocaleDateString('en-IN')
            return `[${date}] ${sender}: ${m.content}`
          })
          .join('\n')
      }
    }
  }

  // ── Also fetch dispute evidence submissions ─────────────────────────────────

  let evidenceLines = ''
  const { data: evidence } = await supabaseAdmin
    .from('dispute_evidence')
    .select('description, file_url, submitted_at, submitter:submitter_id(full_name, role)')
    .eq('dispute_id', dispute_id)
    .order('submitted_at', { ascending: true })

  if (evidence && evidence.length > 0) {
    evidenceLines = '\n\nEVIDENCE SUBMITTED:\n' + evidence.map(e => {
      const sub = e.submitter as { full_name?: string; role?: string } | null
      return `- ${sub?.full_name ?? 'User'} (${sub?.role ?? '?'}): ${e.description ?? ''}${e.file_url ? ' [file attached]' : ''}`
    }).join('\n')
  }

  // ── Build milestone summary ─────────────────────────────────────────────────

  const milestones: MilestoneRow[] = contract?.milestones ?? []
  const approved  = milestones.filter(m => m.status === 'approved')
  const delivered = milestones.filter(m => m.status === 'delivered')
  const pending   = milestones.filter(m => ['pending', 'in_progress'].includes(m.status))

  const milestoneText = milestones.length === 0
    ? 'No milestones (fixed-price contract)'
    : milestones.map(m =>
        `• ${m.name} — ₹${m.amount} — ${m.status}` +
        (m.delivered_at ? ' [delivered]' : '') +
        (m.approved_at  ? ' [approved & paid]' : '') +
        (m.due_date && !m.approved_at ? ` [due ${new Date(m.due_date).toLocaleDateString('en-IN')}]` : '')
      ).join('\n')

  // ── Build Groq prompt ───────────────────────────────────────────────────────

  const systemPrompt = `You are a fair, impartial dispute resolver for TaskPay — a freelance marketplace.
You analyze contract disputes and provide structured, evidence-based verdicts.
Always respond ONLY with valid JSON. No markdown, no extra text, no code fences.`

  const userPrompt = `Analyze this freelance contract dispute and provide a fair verdict.

CONTRACT:
• Job: ${contract?.job?.title ?? 'Unknown'}
• Contract value: ₹${contract?.amount ?? 0}
• Client: ${contract?.client?.full_name ?? 'Unknown'}
• Freelancer: ${contract?.freelancer?.full_name ?? 'Unknown'}
• Contract status: ${contract?.status ?? 'unknown'}
• Started: ${contract?.created_at ? new Date(contract.created_at).toLocaleDateString('en-IN') : '?'}
• Dispute raised by: ${raisedBy?.full_name ?? 'Unknown'} (${raisedBy?.role ?? '?'})

MILESTONES (${milestones.length} total — ${approved.length} approved, ${delivered.length} delivered pending approval, ${pending.length} pending):
${milestoneText}
Approved value: ₹${approved.reduce((s, m) => s + (m.amount ?? 0), 0)}
Unapproved value: ₹${[...delivered, ...pending].reduce((s, m) => s + (m.amount ?? 0), 0)}

DISPUTE REASON (verbatim):
"${dispute.reason}"
${evidenceLines}

CHAT HISTORY (${chatLines.split('\n').length} messages):
${chatLines}

Respond with ONLY this JSON (no markdown, no code blocks):
{
  "summary": "2-sentence neutral case summary",
  "evidence_for_freelancer": ["point 1", "point 2", "point 3"],
  "evidence_for_client": ["point 1", "point 2", "point 3"],
  "recommendation": "pay_freelancer",
  "split_percentage": 100,
  "reasoning": "3-sentence explanation of your verdict",
  "confidence": 80
}

Rules:
- recommendation must be exactly one of: "pay_freelancer", "refund_client", "split"
- split_percentage = what the FREELANCER receives (0–100). Use 100 for pay_freelancer, 0 for refund_client
- confidence is 0–100; be conservative (< 60) if evidence is ambiguous
- evidence lists: 2–4 bullet points each, specific and factual`

  // ── Call Groq ───────────────────────────────────────────────────────────────

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.25,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ''

  let analysis: unknown
  try {
    analysis = JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned unparseable response. Please retry.' }, { status: 422 })
    }
    try { analysis = JSON.parse(jsonMatch[0]) }
    catch { return NextResponse.json({ error: 'AI returned invalid JSON. Please retry.' }, { status: 422 }) }
  }

  return NextResponse.json({ analysis })
}
