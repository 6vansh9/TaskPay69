import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((adminProfile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { action, admin_notes } = await request.json()
  const validActions = ['ban', 'unban', 'warn', 'verify_phone', 'verify_edu']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (admin_notes !== undefined) updates.admin_notes = admin_notes

  switch (action) {
    case 'ban':    updates.is_banned = true; break
    case 'unban':  updates.is_banned = false; break
    case 'warn':   updates.warned_at = new Date().toISOString(); break
    case 'verify_phone': updates.phone_verified = true; break
    case 'verify_edu':   updates.edu_verified = true; break
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'ban') {
    await supabase.from('notifications').insert({
      user_id: id,
      title: 'Account suspended',
      message: 'Your account has been suspended. Contact support for more information.',
      type: 'system',
    })
  } else if (action === 'warn') {
    await supabase.from('notifications').insert({
      user_id: id,
      title: 'Account warning',
      message: admin_notes ?? 'You have received a warning on your account.',
      type: 'system',
    })
  }

  return NextResponse.json({ success: true })
}
