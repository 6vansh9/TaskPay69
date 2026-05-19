import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 25 * 1024 * 1024 // 25 MB
const ALLOWED_MIME = [
  'image/jpeg','image/png','image/webp','image/gif',
  'application/pdf',
  'application/zip','application/x-zip-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify participant
  const { data: conv } = await supabase
    .from('conversations')
    .select('client_id, freelancer_id')
    .eq('id', conversationId)
    .single()
  const c = conv as { client_id: string; freelancer_id: string } | null
  if (!c || (c.client_id !== user.id && c.freelancer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided. Field name must be "file".' }, { status: 400 })
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({
      error: 'File type not supported. Allowed: images, PDF, Word, Excel, ZIP, plain text.',
    }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 25 MB.' }, { status: 413 })
  }

  // Sanitise filename: strip path components, replace spaces
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+|_+$/g, '').slice(0, 200)
  const path = `${conversationId}/${user.id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl, name: file.name, size: file.size, type: file.type })
}
