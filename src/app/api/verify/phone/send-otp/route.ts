import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return Response.json({ error: 'Phone required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: dbError } = await supabaseAdmin
      .from('otp_requests')
      .insert({
        user_id: user.id,
        otp_code: otp,
        otp_type: 'phone',
        otp_expires_at: expiresAt,
        otp_attempts: 0,
      })

    if (dbError) {
      console.error('DB Error:', dbError)
      return Response.json({ error: dbError.message }, { status: 500 })
    }

    const cleanPhone = phone.replace('+91', '')
      .replace(/\s/g, '').replace(/-/g, '')

    const smsResponse = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: '91' + cleanPhone,
        otp: otp,
      }),
    })

    const smsResult = await smsResponse.json()
    console.log('MSG91 response:', smsResult)

    if (smsResult.type !== 'success') {
      return Response.json({
        error: 'Failed to send SMS: ' + JSON.stringify(smsResult),
      }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err: unknown) {
    console.error('UNEXPECTED ERROR:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
