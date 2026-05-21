import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    // Surface the RPC message directly — it may include actionable info
    // (e.g. "You have 2 active contract(s)…")
    const msg = error.message ?? 'Failed to delete account. Please try again.'
    const isUserError = msg.includes('contract')
    return NextResponse.json({ error: msg }, { status: isUserError ? 409 : 500 })
  }

  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
