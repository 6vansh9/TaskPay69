import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      client:client_id(id, full_name, avatar_url, company_name),
      freelancer:freelancer_id(id, full_name, avatar_url, title),
      job:job_id(id, title)
    `)
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const convIds = (data ?? []).map((c: { id: string }) => c.id)

  if (convIds.length === 0) return NextResponse.json([])

  // Fetch last message per conversation and unread counts in parallel
  const [{ data: msgData }, { data: unreadData }] = await Promise.all([
    supabase
      .from('messages')
      .select('conversation_id, content, created_at, sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(convIds.length * 3),
    supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('read', false)
      .neq('sender_id', user.id),
  ])

  // Build lookup maps
  const lastMsgMap: Record<string, { content: string; created_at: string; sender_id: string }> = {}
  for (const m of msgData ?? []) {
    if (m.conversation_id && !lastMsgMap[m.conversation_id]) {
      lastMsgMap[m.conversation_id] = m
    }
  }
  const unreadMap: Record<string, number> = {}
  for (const m of unreadData ?? []) {
    if (m.conversation_id) unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1
  }

  const enriched = (data ?? []).map((c: { id: string }) => ({
    ...c,
    last_message: lastMsgMap[c.id] ?? null,
    unread_count: unreadMap[c.id] ?? 0,
  }))

  // Sort by last message recency
  enriched.sort((a: { last_message: { created_at: string } | null; id: string }, b: { last_message: { created_at: string } | null; id: string }) => {
    const aTime = a.last_message?.created_at ?? ''
    const bTime = b.last_message?.created_at ?? ''
    return bTime.localeCompare(aTime)
  })

  return NextResponse.json(enriched)
}
