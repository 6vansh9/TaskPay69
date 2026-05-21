import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const otp   = typeof body.otp === 'string'   ? body.otp.trim()                  : ''

    if (!email || !otp) {
      return NextResponse.json({ error: 'email and otp are required.' }, { status: 400 })
    }

    // Verify profile edu_email matches
    const { data: profile } = await supabase
      .from('profiles')
      .select('edu_email, edu_verified')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    if ((profile.edu_email ?? '').toLowerCase().trim() !== email) {
      return NextResponse.json({ error: 'Email mismatch — please request a new OTP.' }, { status: 400 })
    }
    if (profile.edu_verified) {
      return NextResponse.json({ error: 'Already verified.' }, { status: 409 })
    }

    const now = new Date().toISOString()

    // Find active OTP row
    const { data: otpRow, error: lookupErr } = await supabase
      .from('otp_requests')
      .select('id, otp_code, otp_attempts, otp_expires_at')
      .eq('user_id', user.id)
      .eq('otp_type', 'edu')
      .gt('otp_expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lookupErr) {
      console.error('[edu/confirm] lookup error:', lookupErr.message)
      return NextResponse.json({ error: 'Lookup failed. Please try again.' }, { status: 500 })
    }
    if (!otpRow) {
      return NextResponse.json({ error: 'OTP expired or not found. Request a new code.' }, { status: 400 })
    }

    const attempts = (otpRow.otp_attempts as number) ?? 0
    if (attempts >= 5) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Request a new OTP.' }, { status: 429 })
    }

    if (otp !== otpRow.otp_code) {
      await supabase
        .from('otp_requests')
        .update({ otp_attempts: attempts + 1 })
        .eq('id', otpRow.id)
      const remaining = 5 - (attempts + 1)
      return NextResponse.json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      }, { status: 400 })
    }

    // Mark verified — expire the OTP row and update profile
    await Promise.all([
      supabase.from('otp_requests')
        .update({ otp_expires_at: new Date(0).toISOString() })
        .eq('id', otpRow.id),
      supabase.from('profiles')
        .update({ edu_verified: true })
        .eq('id', user.id),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[edu/confirm] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
