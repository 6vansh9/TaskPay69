import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ids: [] })

  const { data } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('user_id', user.id)

  return NextResponse.json({ ids: (data ?? []).map((r: { job_id: string }) => r.job_id) })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { job_id } = body as { job_id?: string }
  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('saved_jobs')
    .select('id')
    .eq('user_id', user.id)
    .eq('job_id', job_id)
    .maybeSingle()

  if (existing) {
    await supabase.from('saved_jobs').delete().eq('id', existing.id)
    return NextResponse.json({ saved: false })
  }

  await supabase.from('saved_jobs').insert({ user_id: user.id, job_id })
  return NextResponse.json({ saved: true })
}
