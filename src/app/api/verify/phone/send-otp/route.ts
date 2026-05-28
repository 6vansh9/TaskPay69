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

    console.log('STEP 1 - user:', user?.id)

    const userEmail = user.email ?? 'unknown'
    console.log('STEP 2 - profile email:', userEmail)

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

    console.log('STEP 3 - otp insert error:', dbError)

    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 })
    }

    const cleanPhone = phone.replace('+91', '')
      .replace(/\s/g, '').replace(/-/g, '')

    console.log('STEP 4 - sms sending...')

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
    console.log('MSG91 full response:', JSON.stringify(smsResult))
    console.log('STEP 5 - sms sent successfully:', smsResult)

    if (smsResult.type !== 'success') {
      console.error('MSG91 error:', JSON.stringify(smsResult))
      return Response.json({
        error: 'SMS failed: ' + (smsResult.message || JSON.stringify(smsResult)),
      }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err: any) {
    console.error('FATAL ERROR:', err.message, err.stack)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
