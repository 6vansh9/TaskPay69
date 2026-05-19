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
  if (!['declined', 'pending'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  // verify caller is the job's client
  const { data: proposalRaw } = await supabase.from('proposals').select('job_id').eq('id', id).single()
  const proposal = proposalRaw as { job_id: string } | null
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: jobRaw } = await supabase.from('jobs').select('client_id').eq('id', proposal.job_id).single()
  const job = jobRaw as { client_id: string } | null
  if (job?.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.from('proposals').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
