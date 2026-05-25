import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { freelancer_id } = body as { freelancer_id?: string }
  if (!freelancer_id) return NextResponse.json({ error: 'freelancer_id required' }, { status: 400 })

  // Verify the job belongs to this client and is open
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, client_id, status')
    .eq('id', jobId)
    .single()

  if (!job || job.client_id !== user.id) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Don't invite to closed/filled jobs
  if (job.status !== 'open') {
    return NextResponse.json({ error: 'Job is no longer open' }, { status: 400 })
  }

  // Don't invite yourself
  if (freelancer_id === user.id) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
  }

  // Idempotent — check for duplicate invite notification in the last 7 days
  const since = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { data: existing } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('user_id', freelancer_id)
    .eq('type', 'proposal')
    .eq('link', `/jobs/${jobId}`)
    .gte('created_at', since)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, duplicate: true })
  }

  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: freelancer_id,
    type: 'proposal',
    title: `You've been invited to apply for: "${job.title}"`,
    link: `/jobs/${jobId}`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
