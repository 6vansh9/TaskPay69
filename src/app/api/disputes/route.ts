import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDisputeEmail, sendAdminDisputeAlertEmail } from '@/lib/email'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get disputes for contracts where user is a party
  const { data, error } = await supabase
    .from('disputes')
    .select(`*, contract:contract_id(id, job:job_id(title), client_id, freelancer_id)`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter to user's disputes only
  const filtered = (data ?? []).filter((d: unknown) => {
    const dispute = d as { contract: { client_id: string; freelancer_id: string } | null }
    return dispute.contract?.client_id === user.id || dispute.contract?.freelancer_id === user.id
  })

  return NextResponse.json(filtered)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contract_id, reason } = await request.json()
  if (!contract_id) return NextResponse.json({ error: 'contract_id required' }, { status: 400 })
  if (!reason?.trim() || reason.length < 20) {
    return NextResponse.json({ error: 'Reason must be at least 20 characters' }, { status: 400 })
  }

  // Verify user is a party to the contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('client_id, freelancer_id, status')
    .eq('id', contract_id)
    .single()

  const c = contract as { client_id: string; freelancer_id: string; status: string } | null
  if (!c || (c.client_id !== user.id && c.freelancer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (c.status === 'complete' || c.status === 'cancelled') {
    return NextResponse.json({ error: 'Cannot dispute a closed contract' }, { status: 409 })
  }

  // Check no open dispute exists
  const { data: existing } = await supabase
    .from('disputes')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('status', 'open')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'An open dispute already exists for this contract' }, { status: 409 })

  const { data: dispute, error } = await supabase.from('disputes').insert({
    contract_id,
    raised_by: user.id,
    reason: reason.trim(),
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Freeze contract
  await supabase.from('contracts').update({ status: 'disputed' }).eq('id', contract_id)

  // Notify other party
  const otherUserId = c.client_id === user.id ? c.freelancer_id : c.client_id
  await supabase.from('notifications').insert({
    user_id: otherUserId,
    title: 'Dispute raised ⚠️',
    message: 'A dispute has been raised on your contract. Our team will review it.',
    type: 'dispute',
    link: `/contracts/${contract_id}`,
  })

  // Email both parties
  const [{ data: parties }, { data: jobData }, { data: adminProfiles }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role').in('id', [c.client_id, c.freelancer_id]),
    supabase.from('contracts').select('amount, job:job_id(title)').eq('id', contract_id).single(),
    supabase.from('profiles').select('id').eq('role', 'admin'),
  ])

  const jobTitle = (jobData as unknown as { job: { title: string } | null } | null)?.job?.title ?? 'Contract'
  const contractAmount = (jobData as unknown as { amount: number } | null)?.amount ?? 0
  const raiser = (parties ?? []).find(p => p.id === user.id)
  const raiserProfile = raiser as { id: string; full_name: string; email: string; role: string } | undefined
  const raiserName = raiserProfile?.full_name ?? 'A party'
  const raiserRole = raiserProfile?.role ?? 'user'

  // Notify admin users in-app
  if ((adminProfiles ?? []).length > 0) {
    await supabase.from('notifications').insert(
      (adminProfiles ?? []).map(a => ({
        user_id: a.id,
        title: '⚠️ New dispute raised',
        message: `${raiserName} raised a dispute on "${jobTitle}". Review required.`,
        type: 'dispute',
        link: '/admin/disputes',
      }))
    )
  }

  // Email parties + admin
  for (const party of (parties ?? [])) {
    const p = party as { id: string; full_name: string; email: string }
    sendDisputeEmail({
      partyEmail: p.email,
      partyName: p.full_name ?? '',
      raisedByName: raiserName,
      jobTitle,
      contractId: contract_id,
      reason: reason.trim(),
    }).catch(() => {})
  }

  sendAdminDisputeAlertEmail({
    jobTitle,
    raisedByName: raiserName,
    raisedByRole: raiserRole,
    reason: reason.trim(),
    amount: contractAmount,
    contractId: contract_id,
    disputeId: (dispute as { id: string }).id,
  }).catch(() => {})

  return NextResponse.json(dispute, { status: 201 })
}
