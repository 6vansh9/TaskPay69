import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashValue } from '@/lib/twilio'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { edu_email, otp } = await request.json()
  if (!edu_email || !otp) return NextResponse.json({ error: 'edu_email and otp required' }, { status: 400 })

  // Verify edu_email matches what's stored on profile
  const { data: profile } = await supabase
    .from('profiles').select('edu_email, edu_verified').eq('id', user.id).single()

  if (!profile || profile.edu_email !== edu_email) {
    return NextResponse.json({ error: 'Email mismatch. Send OTP first.' }, { status: 400 })
  }
  if (profile.edu_verified) return NextResponse.json({ error: 'Already verified' }, { status: 409 })

  const emailHash = hashValue(edu_email)
  const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex')
  const now = new Date().toISOString()

  // Find active OTP request
  const { data: otpRow } = await supabase
    .from('otp_requests')
    .select('id, otp_hash, attempts, expires_at, verified_at')
    .eq('type', 'edu')
    .eq('target_hash', emailHash)
    .is('verified_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otpRow) return NextResponse.json({ error: 'OTP expired or not found. Request a new one.' }, { status: 400 })

  if ((otpRow.attempts ?? 0) >= 5) {
    return NextResponse.json({ error: 'Too many incorrect attempts. Request a new OTP.' }, { status: 429 })
  }

  if (otpRow.otp_hash !== otpHash) {
    await supabase.from('otp_requests')
      .update({ attempts: (otpRow.attempts ?? 0) + 1 })
      .eq('id', otpRow.id)
    const remaining = 5 - ((otpRow.attempts ?? 0) + 1)
    return NextResponse.json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` }, { status: 400 })
  }

  // Mark OTP as used
  await supabase.from('otp_requests').update({ verified_at: now }).eq('id', otpRow.id)

  // Mark profile as edu verified
  await supabase.from('profiles').update({ edu_verified: true }).eq('id', user.id)

  return NextResponse.json({ success: true })
}
