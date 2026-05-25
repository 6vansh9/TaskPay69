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

    const cleanPhone = phone.replace('+91', '').replace(/\s/g, '').replace(/-/g, '')

    const smsResponse = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: cleanPhone,
      }),
    })

    const smsResult = await smsResponse.json()
    console.log('Fast2SMS response:', smsResult)

    if (!smsResult.return) {
      console.error('Fast2SMS error:', smsResult)
      return Response.json({
        error: 'Failed to send SMS: ' + (smsResult.message || 'Unknown error'),
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: 'OTP sent to your phone number',
    })

  } catch (err: unknown) {
    console.error('UNEXPECTED ERROR:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
