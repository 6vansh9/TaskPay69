import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { phone, code } = body as { phone?: string; code?: string }
    if (!phone || !code) {
      return Response.json({ error: 'phone and code are required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', user.id)
      .single()

    if (!profile) return Response.json({ error: 'Profile not found.' }, { status: 404 })
    if (profile.phone_verified) {
      return Response.json({ error: 'Phone number is already verified.' }, { status: 409 })
    }

    const now = new Date().toISOString()

    const { data: otpRow, error: lookupErr } = await supabase
      .from('otp_requests')
      .select('id, otp_code, otp_attempts, otp_expires_at')
      .eq('user_id', user.id)
      .eq('otp_type', 'phone')
      .gt('otp_expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lookupErr) {
      console.error('[phone/confirm] lookup error:', lookupErr.message)
      return Response.json({ error: 'Lookup failed. Please try again.' }, { status: 500 })
    }
    if (!otpRow) {
      return Response.json({ error: 'OTP expired or not found. Request a new code.' }, { status: 400 })
    }

    const attempts = (otpRow.otp_attempts as number) ?? 0
    if (attempts >= 5) {
      return Response.json({ error: 'Too many incorrect attempts. Request a new OTP.' }, { status: 429 })
    }

    if (code !== otpRow.otp_code) {
      await supabase
        .from('otp_requests')
        .update({ otp_attempts: attempts + 1 })
        .eq('id', otpRow.id)
      const remaining = 5 - (attempts + 1)
      return Response.json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      }, { status: 400 })
    }

    await Promise.all([
      supabase.from('otp_requests')
        .update({ otp_expires_at: new Date(0).toISOString() })
        .eq('id', otpRow.id),
      supabase.from('profiles')
        .update({ phone_verified: true })
        .eq('id', user.id),
    ])

    return Response.json({ success: true })
  } catch (err) {
    console.error('[phone/confirm] Unexpected error:', err)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
