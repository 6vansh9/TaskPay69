import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDisputeResolvedEmail } from '@/lib/email'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('disputes')
    .select(`*, contract:contract_id(id, client_id, freelancer_id, job:job_id(title))`)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dispute = data as unknown as { contract: { client_id: string; freelancer_id: string } | null }
  if (dispute.contract?.client_id !== user.id && dispute.contract?.freelancer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(data)
}

// Admin-only: resolve dispute
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Basic admin check via profile role (extend with proper admin role in production)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { resolution, winner, admin_notes } = await request.json()
  if (!resolution?.trim()) return NextResponse.json({ error: 'Resolution required' }, { status: 400 })
  if (!['client', 'freelancer'].includes(winner)) {
    return NextResponse.json({ error: 'winner must be client or freelancer' }, { status: 400 })
  }

  const { data: dispute } = await supabase
    .from('disputes')
    .select(`*, contract:contract_id(id, client_id, freelancer_id, razorpay_payment_id, job:job_id(title))`)
    .eq('id', id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  await supabase.from('disputes').update({
    status: 'resolved',
    resolution: resolution.trim(),
    admin_notes: admin_notes ?? null,
    resolved_at: new Date().toISOString(),
  }).eq('id', id)

  const contract = (dispute as unknown as { contract: { id: string; client_id: string; freelancer_id: string; job?: { title?: string } } | null }).contract
  if (contract) {
    const newStatus = winner === 'client' ? 'cancelled' : 'complete'
    await supabase.from('contracts').update({ status: newStatus }).eq('id', contract.id)

    await supabase.from('notifications').insert([
      {
        user_id: contract.client_id,
        title: 'Dispute resolved',
        message: `Admin resolved the dispute. Decision: ${resolution}`,
        type: 'dispute',
        link: `/contracts/${contract.id}`,
      },
      {
        user_id: contract.freelancer_id,
        title: 'Dispute resolved',
        message: `Admin resolved the dispute. Decision: ${resolution}`,
        type: 'dispute',
        link: `/contracts/${contract.id}`,
      },
    ])
  }

  // Send resolution emails
  if (contract) {
    const { data: parties } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [contract.client_id, contract.freelancer_id])

    const jobTitle = contract.job?.title ?? 'Contract'

    for (const party of (parties ?? [])) {
      const p = party as { id: string; full_name: string; email: string }
      const isWinner = winner === 'client' ? p.id === contract.client_id : p.id === contract.freelancer_id
      sendDisputeResolvedEmail({
        partyEmail: p.email,
        partyName: p.full_name ?? '',
        jobTitle,
        contractId: contract.id,
        resolution: resolution.trim(),
        winner,
        isWinner,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}
