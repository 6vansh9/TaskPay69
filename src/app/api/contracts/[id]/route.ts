import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      job:job_id(id, title, category, description, budget_type),
      client:client_id(id, full_name, avatar_url, company_name, rating),
      freelancer:freelancer_id(id, full_name, avatar_url, title, rating, skills),
      milestones(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  const contract = data as unknown as { client_id: string; freelancer_id: string }
  if (contract.client_id !== user.id && contract.freelancer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  const allowed = ['delivered', 'complete', 'cancelled']
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data, error } = await supabase
    .from('contracts')
    .update({ status, completed_at: status === 'complete' ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
