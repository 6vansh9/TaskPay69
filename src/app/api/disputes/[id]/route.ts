import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendDisputeResolvedEmail } from '@/lib/email'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select(`
      *,
      raised_by_profile:raised_by(id, full_name, avatar_url, role),
      contract:contract_id(
        id, client_id, freelancer_id, amount, status, created_at,
        job:job_id(id, title),
        client:client_id(id, full_name, avatar_url, role),
        freelancer:freelancer_id(id, full_name, avatar_url, role),
        milestones(id, name, description, amount, status, due_date, delivered_at, approved_at, created_at)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dispute = data as unknown as { contract: { client_id: string; freelancer_id: string } | null }
  const isAdmin = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    .then(r => (r.data as { role: string } | null)?.role === 'admin')
  if (!isAdmin && dispute.contract?.client_id !== user.id && dispute.contract?.freelancer_id !== user.id) {
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

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()

  // Mark under review (no resolution needed yet)
  if (body.action === 'review') {
    await supabaseAdmin.from('disputes').update({ status: 'under_review' }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  const { resolution, winner, admin_notes, split_pct } = body
  if (!resolution?.trim()) return NextResponse.json({ error: 'Resolution required' }, { status: 400 })
  if (!['client', 'freelancer', 'split'].includes(winner)) {
    return NextResponse.json({ error: 'winner must be client, freelancer, or split' }, { status: 400 })
  }
  if (winner === 'split') {
    if (typeof split_pct !== 'number' || split_pct < 0 || split_pct > 100) {
      return NextResponse.json({ error: 'split_pct must be 0–100' }, { status: 400 })
    }
  }

  const { data: dispute } = await supabaseAdmin
    .from('disputes')
    .select(`*, contract:contract_id(id, client_id, freelancer_id, job:job_id(title))`)
    .eq('id', id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  await supabaseAdmin.from('disputes').update({
    status: 'resolved',
    resolution: resolution.trim(),
    admin_notes: admin_notes ?? null,
    resolved_at: new Date().toISOString(),
  }).eq('id', id)

  const contract = (dispute as unknown as { contract: { id: string; client_id: string; freelancer_id: string; amount?: number; job?: { title?: string } } | null }).contract
  if (contract) {
    // For split: contract stays complete, we note the split
    const newStatus = winner === 'client' ? 'cancelled' : 'complete'
    await supabaseAdmin.from('contracts').update({ status: newStatus }).eq('id', contract.id)

    // Build per-party decision messages
    const clientMsg = winner === 'client'
      ? 'The dispute was resolved in your favour. Escrow will be refunded.'
      : winner === 'split'
        ? `The dispute was split. Freelancer receives ${split_pct}%, you receive ${100 - split_pct}%.`
        : 'The dispute was resolved in favour of the freelancer. Payment released.'

    const freelancerMsg = winner === 'freelancer'
      ? 'The dispute was resolved in your favour. Payment has been released.'
      : winner === 'split'
        ? `The dispute was split. You receive ${split_pct}% of the contract amount.`
        : 'The dispute was resolved in favour of the client. Payment has been refunded.'

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: contract.client_id,
        title: 'Dispute resolved',
        message: clientMsg,
        type: 'dispute',
        link: `/disputes/${id}`,
      },
      {
        user_id: contract.freelancer_id,
        title: 'Dispute resolved',
        message: freelancerMsg,
        type: 'dispute',
        link: `/disputes/${id}`,
      },
    ])
  }

  // Send resolution emails to both parties
  if (contract) {
    const { data: parties } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [contract.client_id, contract.freelancer_id])

    const jobTitle = contract.job?.title ?? 'Contract'
    const effectiveWinner = winner === 'split' ? 'split' : winner as 'client' | 'freelancer'

    for (const party of (parties ?? [])) {
      const p = party as { id: string; full_name: string; email: string }
      const isWinner = effectiveWinner === 'split'
        ? true  // both get partial win in split
        : effectiveWinner === 'client' ? p.id === contract.client_id : p.id === contract.freelancer_id
      const resolvedWinner = effectiveWinner === 'split' ? 'freelancer' : effectiveWinner
      sendDisputeResolvedEmail({
        partyEmail: p.email,
        partyName: p.full_name ?? '',
        jobTitle,
        contractId: contract.id,
        resolution: winner === 'split'
          ? `${resolution.trim()} (Split: freelancer ${split_pct}%, client ${100 - split_pct}%)`
          : resolution.trim(),
        winner: resolvedWinner,
        isWinner,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}
