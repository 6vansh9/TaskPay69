import Razorpay from 'razorpay'
import crypto from 'crypto'

const keyId     = process.env.RAZORPAY_KEY_ID     ?? ''
const keySecret = process.env.RAZORPAY_KEY_SECRET  ?? ''
const isPlaceholder = !keyId || keyId.startsWith('rzp_test_REPLACE')

export const razorpay = isPlaceholder
  ? null
  : new Razorpay({ key_id: keyId, key_secret: keySecret })

export const PLATFORM_FEE_PCT = 0.10   // 10% kept by platform

export function isRazorpayReady(): boolean {
  return !isPlaceholder
}

/** Verify Razorpay payment signature after checkout success */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex')
  return expected === signature
}

/** Verify Razorpay webhook signature */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''
  if (!secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return expected === signature
}
