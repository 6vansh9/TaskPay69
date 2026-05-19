import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendProposalReceivedEmail } from '@/lib/email'

function connectsCost(budgetMax: number | null): number {
  if (!budgetMax) return 2
  if (budgetMax < 50000) return 2
  if (budgetMax < 500000) return 4
  return 6
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // only job owner can list proposals
  const { data: jobRaw } = await supabase.from('jobs').select('client_id').eq('id', jobId).single()
  const job = jobRaw as { client_id: string } | null
  if (job?.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sort = request.nextUrl.searchParams.get('sort') || 'created_at'
  const sortMap: Record<string, { col: string; asc: boolean }> = {
    created_at:   { col: 'created_at', asc: false },
    bid_amount_asc:  { col: 'bid_amount', asc: true },
    bid_amount_desc: { col: 'bid_amount', asc: false },
  }
  const { col, asc } = sortMap[sort] ?? sortMap.created_at

  const { data, error } = await supabase
    .from('proposals')
    .select(`*, profiles:freelancer_id(full_name, avatar_url, title, rating, review_count, jobs_completed, skills, location, hourly_rate, phone_verified, edu_verified)`)
    .eq('job_id', jobId)
    .neq('status', 'declined')
    .order(col, { ascending: asc })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role, connects_balance, full_name')
    .eq('id', user.id).single()
  const profile = profileRaw as { role: string; connects_balance: number; full_name: string | null } | null

  if (profile?.role !== 'freelancer') return NextResponse.json({ error: 'Only freelancers can submit proposals' }, { status: 403 })

  const body = await request.json()
  const { job_id, cover_letter, bid_amount, delivery_days, attachment_url } = body

  if (!cover_letter || cover_letter.length < 100) return NextResponse.json({ error: 'Cover letter must be at least 100 characters' }, { status: 400 })
  if (!bid_amount || bid_amount <= 0) return NextResponse.json({ error: 'Valid bid amount required' }, { status: 400 })
  if (!delivery_days || delivery_days < 1) return NextResponse.json({ error: 'Delivery days required' }, { status: 400 })

  // check for existing proposal
  const { data: existing } = await supabase.from('proposals').select('id').eq('job_id', job_id).eq('freelancer_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'You already submitted a proposal for this job' }, { status: 409 })

  const { data: jobRaw } = await supabase.from('jobs').select('budget_max, client_id, title').eq('id', job_id).single()
  if (!jobRaw) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  const jobInfo = jobRaw as unknown as { budget_max: number | null; client_id: string | null; title: string }

  const cost = connectsCost(jobInfo.budget_max)
  if ((profile?.connects_balance ?? 0) < cost) return NextResponse.json({ error: `Insufficient connects. Need ${cost}, have ${profile?.connects_balance ?? 0}` }, { status: 402 })

  const { data: proposal, error } = await supabase.from('proposals').insert({
    job_id, freelancer_id: user.id, cover_letter, bid_amount,
    delivery_days, attachment_url: attachment_url || null,
    connects_used: cost, status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })


  // deduct connects & increment proposals_count (best-effort)
  await Promise.all([
    supabase.from('profiles').update({ connects_balance: (profile.connects_balance ?? 0) - cost }).eq('id', user.id),
    supabase.rpc('increment_proposals_count' as never, { job_id } as never),
  ]).catch(() => {})

  return NextResponse.json(proposal, { status: 201 })
}
