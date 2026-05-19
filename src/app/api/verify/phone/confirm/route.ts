import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashValue, checkVerification, twilioClient } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { phone, code } = body as { phone?: string; code?: string }
  if (!phone || !code) {
    return NextResponse.json({ error: 'phone and code are required' }, { status: 400 })
  }

  // Verify the phone hash on file matches what they claimed to verify
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_hash, phone_verified')
    .eq('id', user.id)
    .single()

  const phoneHash = hashValue(phone)
  if (!profile || profile.phone_hash !== phoneHash) {
    return NextResponse.json(
      { error: 'Phone number mismatch — please send an OTP first.' },
      { status: 400 }
    )
  }
  if (profile.phone_verified) {
    return NextResponse.json({ error: 'Phone number is already verified.' }, { status: 409 })
  }

  if (!twilioClient) {
    // Should not reach here in sandbox mode (send-otp auto-verified)
    return NextResponse.json(
      { error: 'Twilio is not configured. Add real keys to enable SMS verification.' },
      { status: 503 }
    )
  }

  const result = await checkVerification(phone, code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Invalid or expired code' }, { status: 400 })
  }

  await supabase.from('profiles').update({ phone_verified: true }).eq('id', user.id)
  return NextResponse.json({ success: true })
}
