import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify access
  const { data: dispute } = await supabaseAdmin
    .from('disputes')
    .select('id, contract:contract_id(client_id, freelancer_id)')
    .eq('id', id)
    .single()

  const contract = (dispute as unknown as { contract: { client_id: string; freelancer_id: string } | null } | null)?.contract
  const isAdmin = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    .then(r => (r.data as { role: string } | null)?.role === 'admin')

  if (!isAdmin && contract?.client_id !== user.id && contract?.freelancer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('dispute_evidence')
    .select(`*, submitter:submitted_by(id, full_name, avatar_url, role)`)
    .eq('dispute_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const content: string = (body.content ?? '').trim()
  const file_urls: string[] = Array.isArray(body.file_urls) ? body.file_urls.filter((u: unknown) => typeof u === 'string' && u.trim()) : []

  if (!content && file_urls.length === 0) {
    return NextResponse.json({ error: 'Evidence must include text or at least one file' }, { status: 400 })
  }

  // Verify user is a party and dispute is still open/under_review
  const { data: dispute } = await supabaseAdmin
    .from('disputes')
    .select('id, status, contract:contract_id(client_id, freelancer_id)')
    .eq('id', id)
    .single()

  const contract = (dispute as unknown as { status: string; contract: { client_id: string; freelancer_id: string } | null } | null)
  if (!contract) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  if (contract.contract?.client_id !== user.id && contract.contract?.freelancer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['open', 'under_review'].includes(contract.status)) {
    return NextResponse.json({ error: 'Cannot submit evidence on a resolved dispute' }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('dispute_evidence')
    .insert({ dispute_id: id, submitted_by: user.id, content: content || null, file_urls })
    .select(`*, submitter:submitted_by(id, full_name, avatar_url, role)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
