import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ids: [] })

  const { data } = await supabase
    .from('saved_freelancers')
    .select('freelancer_id')
    .eq('user_id', user.id)

  return NextResponse.json({ ids: (data ?? []).map((r: { freelancer_id: string }) => r.freelancer_id) })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { freelancer_id } = body as { freelancer_id?: string }
  if (!freelancer_id) return NextResponse.json({ error: 'freelancer_id required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('saved_freelancers')
    .select('id')
    .eq('user_id', user.id)
    .eq('freelancer_id', freelancer_id)
    .maybeSingle()

  if (existing) {
    await supabase.from('saved_freelancers').delete().eq('id', existing.id)
    return NextResponse.json({ saved: false })
  }

  await supabase.from('saved_freelancers').insert({ user_id: user.id, freelancer_id })
  return NextResponse.json({ saved: true })
}
