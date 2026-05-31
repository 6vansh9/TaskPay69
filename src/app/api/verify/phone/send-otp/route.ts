import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()
    if (!phone) return Response.json({ error: 'Phone required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone.replace(/\s/g, '')

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms',
      })

    console.log('Twilio verification status:', verification.status)

    return Response.json({
      success: true,
      message: 'OTP sent to your phone number',
    })

  } catch (err: any) {
    console.error('Twilio error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
