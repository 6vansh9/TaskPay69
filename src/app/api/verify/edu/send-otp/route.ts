import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const VALID_DOMAINS = ['.edu', '.ac.in', '.ac.uk', '.edu.in']

function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

    const isValid = VALID_DOMAINS.some(d => email.toLowerCase().endsWith(d))
    if (!isValid) return Response.json({ error: 'Must be a student email (.edu, .ac.in, .ac.uk, .edu.in)' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    // Save edu_email on profile so confirm route can match it
    await supabase.from('profiles').update({ edu_email: email }).eq('id', user.id)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('otp_requests')
      .insert({
        user_id: user.id,
        email,
        otp_code: otp,
        otp_type: 'edu',
        otp_expires_at: expiresAt,
        otp_attempts: 0,
      })

    if (dbError) {
      console.error('DB error:', dbError)
      return Response.json({ error: dbError.message }, { status: 500 })
    }

    // Sandbox: no Gmail credentials configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('GMAIL_USER / GMAIL_APP_PASSWORD not set — returning OTP in response for dev')
      return Response.json({ sandbox: true, otp, message: 'Sandbox mode: OTP returned directly (no Gmail config).' })
    }

    const transporter = makeTransporter()

    await transporter.sendMail({
      from: `"TaskPay" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'TaskPay Student Verification Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#ffffff;border-radius:12px">
          <h2 style="margin:0 0 4px;color:#14A800;font-size:20px">TaskPay</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#a3a3a3">Student Email Verification</p>

          <p style="margin:0 0 8px;font-size:15px;color:#e0e0e0">
            Verifying: <strong style="color:#ffffff">${email}</strong>
          </p>

          <div style="margin:24px 0;padding:24px;background:#0f1f0f;border:1px solid rgba(20,168,0,0.3);border-radius:10px;text-align:center">
            <p style="margin:0 0 8px;font-size:12px;color:#6ee860;letter-spacing:0.1em;text-transform:uppercase">Your verification code</p>
            <h1 style="margin:0;font-size:52px;font-weight:800;letter-spacing:12px;color:#14A800">${otp}</h1>
          </div>

          <p style="margin:0;font-size:13px;color:#a3a3a3;line-height:1.6">
            Valid for <strong style="color:#ffffff">15 minutes</strong>. Do not share this code with anyone.
          </p>
          <p style="margin:16px 0 0;font-size:11px;color:#555555">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    return Response.json({ success: true, message: `OTP sent to ${email}` })

  } catch (err: unknown) {
    console.error('edu send-otp error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
