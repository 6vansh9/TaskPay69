import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'text/plain',
  'application/zip',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided. Field name must be "file".' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Allowed: images, PDF, text, zip.' }, { status: 415 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('dispute-evidence')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('dispute-evidence').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, name: file.name, type: file.type })
}
