import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const { id, mid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contract } = await supabase.from('contracts').select('client_id, freelancer_id').eq('id', id).single()
  const c = contract as { client_id: string; freelancer_id: string } | null
  if (!c || (c.client_id !== user.id && c.freelancer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { status } = body

  const isFreelancer = c.freelancer_id === user.id
  const isClient = c.client_id === user.id

  const allowed: Record<string, boolean> = {
    delivered: isFreelancer,
    revision_requested: isClient,
    approved: isClient,
    disputed: isClient || isFreelancer,
  }

  if (!allowed[status]) {
    return NextResponse.json({ error: 'Not permitted to set this status' }, { status: 403 })
  }

  const updates: Record<string, unknown> = { status }
  if (status === 'delivered') updates.delivered_at = new Date().toISOString()
  if (status === 'approved') {
    updates.approved_at = new Date().toISOString()
    // increment revision_count if this was requested
  }

  const { data, error } = await supabase.from('milestones').update(updates).eq('id', mid).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the other party
  const notifyUserId = isClient ? c.freelancer_id : c.client_id
  const notifyTitle = status === 'delivered' ? 'Milestone delivered' :
    status === 'approved' ? 'Milestone approved!' :
    status === 'revision_requested' ? 'Revision requested' : 'Milestone update'
  const notifyMsg = status === 'delivered' ? 'A milestone has been marked as delivered for review.'
    : status === 'approved' ? 'Your delivered milestone has been approved!'
    : status === 'revision_requested' ? 'The client has requested revisions on your milestone.'
    : `Milestone status updated to ${status}.`

  supabase.from('notifications').insert({
    user_id: notifyUserId,
    title: notifyTitle,
    message: notifyMsg,
    type: status === 'approved' ? 'payment' : 'proposal',
    link: `/contracts/${id}`,
  })

  return NextResponse.json(data)
}
