import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a participant
  const { data: conv } = await supabase.from('conversations')
    .select('client_id, freelancer_id').eq('id', id).single()
  const c = conv as { client_id: string; freelancer_id: string } | null
  if (!c || (c.client_id !== user.id && c.freelancer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`*, sender:sender_id(id, full_name, avatar_url)`)
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark unread messages as read
  supabase.from('messages')
    .update({ read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .eq('read', false)

  return NextResponse.json(messages ?? [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a participant
  const { data: conv } = await supabase.from('conversations')
    .select('client_id, freelancer_id').eq('id', id).single()
  const c = conv as { client_id: string; freelancer_id: string } | null
  if (!c || (c.client_id !== user.id && c.freelancer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { content, attachment_url, attachment_name } = body
  if (!content?.trim() && !attachment_url) {
    return NextResponse.json({ error: 'Message content required' }, { status: 400 })
  }

  const { data: message, error } = await supabase.from('messages').insert({
    conversation_id: id,
    sender_id: user.id,
    content: content?.trim() ?? '',
    attachment_url: attachment_url ?? null,
    attachment_name: attachment_name ?? null,
    read: false,
  }).select(`*, sender:sender_id(id, full_name, avatar_url)`).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment message_count best-effort
  supabase.from('conversations').update({ message_count: (c as unknown as { message_count: number }).message_count + 1 }).eq('id', id)

  return NextResponse.json(message, { status: 201 })
}
