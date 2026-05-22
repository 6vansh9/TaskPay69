import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proposals')
    .select(`*, profiles:freelancer_id(full_name, avatar_url, title, bio, rating, review_count, jobs_completed, skills, location, hourly_rate, phone_verified, edu_verified, work_experience, portfolio)`)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status } = body
  if (!['declined', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Verify caller is the job's client and load what we need for notifications
  const { data: proposalRaw } = await supabase
    .from('proposals')
    .select('job_id, freelancer_id, jobs:job_id(title, client_id)')
    .eq('id', id)
    .single()

  const proposal = proposalRaw as {
    job_id: string
    freelancer_id: string
    jobs: { title: string; client_id: string } | null
  } | null

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (proposal.jobs?.client_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('proposals')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify freelancer when their proposal is declined (Rule 5)
  if (status === 'declined') {
    const jobTitle = proposal.jobs?.title ?? 'the job'
    void supabase.from('notifications').insert({
      user_id: proposal.freelancer_id,
      title: 'Proposal not selected',
      message: `Your proposal for "${jobTitle}" was not selected.`,
      type: 'bid_received',
      link: `/jobs/${proposal.job_id}`,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: proposalRaw } = await supabase
    .from('proposals')
    .select('id, freelancer_id, job_id, status, connects_used, jobs:job_id(title, client_id)')
    .eq('id', id)
    .single()

  const proposal = proposalRaw as {
    id: string; freelancer_id: string; job_id: string
    status: string; connects_used: number
    jobs: { title: string; client_id: string } | null
  } | null

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  if (proposal.freelancer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (proposal.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending proposals can be withdrawn' }, { status: 409 })
  }

  const { error: delErr } = await supabase.from('proposals').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  const refund = proposal.connects_used ?? 0
  const jobTitle = proposal.jobs?.title ?? 'a job'
  await Promise.all([
    refund > 0
      ? supabase.from('profiles').select('connects_balance').eq('id', user.id).single().then(({ data: p }) =>
          supabase.from('profiles').update({
            connects_balance: ((p as { connects_balance: number } | null)?.connects_balance ?? 0) + refund,
          }).eq('id', user.id)
        )
      : Promise.resolve(),
    refund > 0
      ? supabase.from('connects_transactions').insert({ user_id: user.id, type: 'refund', amount: refund, description: `Withdrawal refund: ${jobTitle}` })
      : Promise.resolve(),
    supabase.from('notifications').insert({
      user_id: proposal.jobs?.client_id,
      title: 'A freelancer withdrew their proposal',
      message: `A freelancer withdrew their proposal for "${jobTitle}".`,
      type: 'bid_received',
      link: `/jobs/${proposal.job_id}/proposals`,
    }),
  ]).catch(() => {})

  return NextResponse.json({ success: true, connects_refunded: refund })
}
