import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json()
    if (!phone || !otp) return Response.json({ error: 'Phone and OTP required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone.replace(/\s/g, '')

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: formattedPhone,
        code: otp,
      })

    console.log('Twilio check status:', verificationCheck.status)

    if (verificationCheck.status !== 'approved') {
      return Response.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        phone_verified: true,
        phone: formattedPhone,
      })
      .eq('id', user.id)

    return Response.json({ success: true })

  } catch (err: any) {
    console.error('Twilio confirm error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
