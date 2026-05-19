import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashValue, generateOtp } from '@/lib/twilio'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_REPLACE_ME'
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const EDU_DOMAINS = /\.(edu|ac\.in|edu\.in|ac\.uk|edu\.au|ac\.nz|ac\.za)$/i

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { edu_email } = await request.json()
  if (!edu_email || !edu_email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const domain = edu_email.split('@')[1] ?? ''
  if (!EDU_DOMAINS.test(domain)) {
    return NextResponse.json({ error: 'Must be a valid student email (.edu, .ac.in, .ac.uk, etc.)' }, { status: 400 })
  }

  const emailHash = hashValue(edu_email)

  // Expire any previous pending OTP for this email
  await supabase.from('otp_requests')
    .update({ expires_at: new Date().toISOString() })
    .eq('type', 'edu')
    .eq('target_hash', emailHash)
    .is('verified_at', null)

  const otp = generateOtp()
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex')
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await supabase.from('otp_requests').insert({
    type: 'edu',
    target_hash: emailHash,
    otp_hash: otpHash,
    expires_at: expiresAt,
  })

  // Save edu_email to profile (unverified)
  await supabase.from('profiles').update({ edu_email, edu_verified: false }).eq('id', user.id)

  if (!resend) {
    // Sandbox: auto-verify
    await supabase.from('profiles').update({ edu_verified: true }).eq('id', user.id)
    await supabase.from('otp_requests').update({ verified_at: new Date().toISOString() })
      .eq('type', 'edu').eq('target_hash', emailHash).is('verified_at', null)
    return NextResponse.json({ sandbox: true, otp, message: 'Sandbox mode — OTP returned in response.' })
  }

  await resend.emails.send({
    from: 'TaskPay <noreply@taskpay.in>',
    to: edu_email,
    subject: 'Your TaskPay student verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#14a800">Verify your student email</h2>
        <p style="color:#444">Use this code to verify your student status on TaskPay. It expires in 15 minutes.</p>
        <div style="background:#f0faea;border:2px solid #14a800;border-radius:12px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0a6300">${otp}</span>
        </div>
        <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
