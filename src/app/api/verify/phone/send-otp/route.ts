import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashValue, sendVerification, twilioClient } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { phone } = body as { phone?: string }
  if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Use E.164 format, e.g. +919876543210' },
      { status: 400 }
    )
  }

  const phoneHash = hashValue(phone)

  // Rate limit: max 3 sends per phone per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('otp_requests')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'phone')
    .eq('target_hash', phoneHash)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Please wait an hour before trying again.' },
      { status: 429 }
    )
  }

  // Store phone hash on profile (marks phone as pending, not yet verified)
  await supabase.from('profiles').update({ phone_hash: phoneHash }).eq('id', user.id)

  // Log request for rate limiting
  await supabase.from('otp_requests').insert({ type: 'phone', target_hash: phoneHash })

  // Sandbox: Twilio keys not configured — auto-verify so demo works without real SMS
  if (!twilioClient) {
    await supabase.from('profiles').update({ phone_verified: true }).eq('id', user.id)
    return NextResponse.json({ sandbox: true, message: 'Sandbox mode: phone auto-verified (no Twilio keys).' })
  }

  const result = await sendVerification(phone)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed to send OTP' }, { status: 422 })
  }

  return NextResponse.json({ success: true })
}
