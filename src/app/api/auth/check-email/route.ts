import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .limit(1)

  if (error) {
    console.error('[check-email] lookup error:', error.message)
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({ exists: true, role: data[0].role }, { status: 409 })
}
