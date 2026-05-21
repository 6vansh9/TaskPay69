import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

    const validDomains = ['.edu', '.ac.in', '.ac.uk', '.edu.in']
    const isValid = validDomains.some(d => email.endsWith(d))
    if (!isValid) return Response.json({ error: 'Must be a student email' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('otp_requests')
      .insert({
        user_id: user.id,
        email: email,
        otp_code: otp,
        otp_type: 'edu',
        otp_expires_at: expiresAt,
        otp_attempts: 0,
      })

    if (dbError) {
      console.error('DB Error:', dbError)
      return Response.json({ error: dbError.message }, { status: 500 })
    }

    const { error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'vansh0145@gmail.com',
      subject: 'OTP for ' + email,
      html: '<div style="font-family:Arial;padding:20px"><h2>Student Email Verification</h2><p>Verifying: <strong>' + email + '</strong></p><h1 style="color:#14A800;font-size:48px;letter-spacing:8px">' + otp + '</h1><p>Valid for 15 minutes.</p></div>',
    })

    if (emailError) {
      console.error('Resend Error:', emailError)
      return Response.json({ error: (emailError as { message?: string }).message ?? 'Email send failed' }, { status: 500 })
    }

    return Response.json({ success: true, message: 'OTP sent to vansh0145@gmail.com' })

  } catch (err: unknown) {
    console.error('UNEXPECTED ERROR:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
