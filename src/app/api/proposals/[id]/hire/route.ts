import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendHiredEmail } from '@/lib/email'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load proposal + job + freelancer profile in parallel
  const [{ data: proposal }, { data: clientProfile }] = await Promise.all([
    supabase.from('proposals')
      .select(`*, jobs:job_id(id, title, client_id, status), profiles:freelancer_id(id, full_name, email)`)
      .eq('id', id).single(),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  const job = proposal.jobs as unknown as { id: string; title: string; client_id: string; status: string } | null
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (job.status !== 'open') return NextResponse.json({ error: 'Job is no longer open' }, { status: 409 })
  if (proposal.status === 'hired') return NextResponse.json({ error: 'Already hired' }, { status: 409 })

  // Create contract
  const { data: contract, error: contractErr } = await supabase.from('contracts').insert({
    job_id: job.id,
    client_id: user.id,
    freelancer_id: proposal.freelancer_id,
    proposal_id: id,
    amount: proposal.bid_amount,
    agreed_rate: proposal.bid_amount,
    budget_type: 'fixed',
    status: 'active',
  }).select().single()

  if (contractErr) return NextResponse.json({ error: contractErr.message }, { status: 500 })

  const freelancerProfile = proposal.profiles as unknown as { id: string; full_name: string | null; email: string | null } | null
  const clientName = (clientProfile as unknown as { full_name: string | null } | null)?.full_name ?? 'A client'

  // Update proposal + job + notify freelancer (parallel, best-effort)
  await Promise.all([
    supabase.from('proposals').update({ status: 'hired' }).eq('id', id),
    supabase.from('jobs').update({ status: 'in_progress' }).eq('id', job.id),
    supabase.from('notifications').insert({
      user_id: proposal.freelancer_id,
      title: 'You got hired! 🎉',
      message: `${clientName} hired you for "${job.title}"`,
      type: 'hired',
      link: `/contracts/${contract.id}`,
    }),
  ])

  // Send hired email (fire-and-forget)
  if (freelancerProfile?.email) {
    sendHiredEmail({
      freelancerEmail: freelancerProfile.email,
      freelancerName: freelancerProfile.full_name ?? 'Freelancer',
      clientName,
      jobTitle: job.title,
      contractId: contract.id,
      agreedRate: proposal.bid_amount ?? 0,
    }).catch(() => {})
  }

  return NextResponse.json({ contract }, { status: 201 })
}
