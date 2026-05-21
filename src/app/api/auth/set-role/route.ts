import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  if (role !== 'client' && role !== 'freelancer') {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.onboarding_complete) {
    return NextResponse.json({ error: 'Cannot change role after onboarding.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (error) {
    console.error('[set-role] error:', error.message)
    return NextResponse.json({ error: 'Failed to set role.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
