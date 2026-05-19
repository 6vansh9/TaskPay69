import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contract } = await supabase.from('contracts').select('client_id, freelancer_id').eq('id', id).single()
  const c = contract as { client_id: string; freelancer_id: string } | null
  if (!c || (c.client_id !== user.id && c.freelancer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase.from('milestones').select('*').eq('contract_id', id).order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: contract } = await supabase.from('contracts').select('client_id, freelancer_id').eq('id', id).single()
  const c = contract as { client_id: string; freelancer_id: string } | null
  if (!c || c.client_id !== user.id) return NextResponse.json({ error: 'Only clients can create milestones' }, { status: 403 })

  const body = await request.json()
  const { name, description, amount, due_date } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount required' }, { status: 400 })

  const { data, error } = await supabase.from('milestones').insert({
    contract_id: id,
    name: name.trim(),
    description: description?.trim() ?? null,
    amount: parseFloat(amount),
    due_date: due_date ?? null,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
