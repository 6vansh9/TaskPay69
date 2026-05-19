import twilio from 'twilio'
import crypto from 'crypto'

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
const authToken  = process.env.TWILIO_AUTH_TOKEN  ?? ''
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID ?? ''

const isReady = !!(accountSid && authToken && serviceSid &&
  !accountSid.startsWith('AC_REPLACE') &&
  !authToken.startsWith('REPLACE') &&
  !serviceSid.startsWith('VA_REPLACE'))

export const twilioClient = isReady ? twilio(accountSid, authToken) : null
export const VERIFY_SERVICE_SID = serviceSid

export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Maps Twilio error codes to friendly messages
function twilioErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: number }).code
    const map: Record<number, string> = {
      21211: 'Invalid phone number. Check the format and try again.',
      21612: 'This number cannot receive SMS. Try a different number.',
      21408: 'SMS not enabled for this region. Use a supported country code.',
      21614: 'This number is not a mobile number.',
      60200: 'Invalid phone number format for Verify service.',
      60203: 'Maximum send attempts reached. Try again in 10 minutes.',
      60204: 'Too many incorrect codes. Request a new OTP.',
      60223: 'Verification already approved.',
      20003: 'Twilio authentication error — check your API credentials.',
      20429: 'Too many requests. Try again in a moment.',
    }
    if (map[code]) return map[code]
    const msg = 'message' in err ? String((err as { message: string }).message) : ''
    return msg || `Twilio error ${code}. Try again.`
  }
  return 'Failed to send verification. Try again.'
}

export interface TwilioResult {
  ok: boolean
  error?: string
}

export async function sendVerification(phone: string): Promise<TwilioResult> {
  if (!twilioClient) return { ok: false, error: 'Twilio not configured' }
  try {
    await twilioClient.verify.v2.services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: 'sms' })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: twilioErrorMessage(err) }
  }
}

export async function checkVerification(phone: string, code: string): Promise<TwilioResult> {
  if (!twilioClient) return { ok: false, error: 'Twilio not configured' }
  try {
    const result = await twilioClient.verify.v2.services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code })
    if (result.status === 'approved') return { ok: true }
    return { ok: false, error: 'Incorrect code. Please try again.' }
  } catch (err) {
    return { ok: false, error: twilioErrorMessage(err) }
  }
}
