import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  // Get conversations where user is participant
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)

  const convIds = (convs ?? []).map((c: { id: string }) => c.id)
  if (convIds.length === 0) return NextResponse.json({ count: 0 })

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .eq('read', false)
    .neq('sender_id', user.id)

  return NextResponse.json({ count: count ?? 0 })
}
